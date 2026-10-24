--!strict
-- The whole game server: agency actions (validated), the mission clock, offline catch-up, career,
-- daily rewards, and passes. Retention systems live in Progression.luau. Server-authoritative:
-- the client only sends requests through Remotes.Act.

local MarketplaceService = game:GetService("MarketplaceService")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TextService = game:GetService("TextService")

local Career = require(ReplicatedStorage.Shared.Config.Career)
local Destinations = require(ReplicatedStorage.Shared.Config.Destinations)
local Economy = require(ReplicatedStorage.Shared.Economy)
local Format = require(ReplicatedStorage.Shared.Format)
local Net = require(ReplicatedStorage.Shared.Net)
local Receipts = require(ReplicatedStorage.Shared.Receipts)
local Remotes = require(ReplicatedStorage.Shared.Remotes)
local Research = require(ReplicatedStorage.Shared.Research)
local Rockets = require(ReplicatedStorage.Shared.Config.Rockets)
local Tuning = require(ReplicatedStorage.Shared.Config.Tuning)
local DataService = require(script.Parent.DataService)
local Progression = require(script.Parent.Progression)
local StatsService = require(script.Parent.StatsService)
local Telemetry = require(script.Parent.Telemetry)

local AgencyService = {}

local allowAct = Net.limiter(8, 12)
local allowThrust = Net.limiter(8, 10) -- thruster taps are their own bucket so fast tapping never blocks real actions
local luck = Random.new()
local ready: { [Player]: boolean } = {}
local passes: { [Player]: { doubleCash: boolean, fastLaunch: boolean } } = {}

local function now(): number
	return workspace:GetServerTimeNow()
end

local function today(): number
	return Progression.today()
end

local function cashMult(player: Player): number
	local m = if passes[player] and passes[player].doubleCash then 2 else 1
	if (workspace:GetAttribute("BoostUntil") or 0) > now() then
		m *= 2
	end
	return m
end

local function fast(player: Player): boolean
	return passes[player] ~= nil and passes[player].fastLaunch
end

local function findById(list: { any }, id: any): (any, number?)
	for i, x in list do
		if x.id == id then
			return x, i
		end
	end
	return nil, nil
end

local function unlocked(p: any, stage: number): boolean
	return p.career.stage >= stage
end

-- What the client renders. Never includes anything the client could use to grant itself value.
local function view(player: Player, p: any)
	local stage, goals = Economy.stageProgress(p)
	local goalView = {}
	for _, g in goals do
		table.insert(goalView, {
			label = g.goal.label,
			value = g.value,
			target = g.goal.target,
			reward = g.goal.reward,
			done = g.done,
			jump = g.goal.jump,
			kind = g.goal.kind,
		})
	end
	local dailyReady = p.daily.lastDay ~= today()
	local streakDay = if p.daily.lastDay == today() - 1 or p.daily.lastDay == today()
		then p.daily.streak
		else 0
	local out = {
		agency = p.agency,
		cash = p.cash,
		lifetime = p.lifetimeEarned,
		rating = Economy.rating(p.missions),
		stage = p.career.stage,
		stageName = stage.name,
		stageBlurb = stage.blurb,
		stageCount = #Career.stages,
		goals = goalView,
		rockets = p.rockets,
		missions = p.missions,
		stats = p.stats,
		daily = {
			ready = dailyReady,
			day = (streakDay % #Tuning.daily) + (if dailyReady then 1 else 0),
			reward = Tuning.daily[(streakDay % #Tuning.daily) + 1],
		},
		passes = passes[player] or { doubleCash = false, fastLaunch = false },
		boostUntil = workspace:GetAttribute("BoostUntil") or 0,
		canSave = player:GetAttribute("CanSave") == true,
		tips = p.tips,
		settings = p.settings,
	}
	for k, v in Progression.view(p, now()) do
		out[k] = v
	end
	return out
end

function AgencyService.push(player: Player)
	local p = DataService.peek(player)
	if p and ready[player] then
		Remotes.State:FireClient(player, view(player, p))
	end
end

local function toast(player: Player, text: string, kind: string?)
	Remotes.Toast:FireClient(player, text, kind or "info")
end

-- Grants rewards for finished goals; promotes when the stage is complete. Returns true if anything changed.
local function careerCheck(player: Player, p: any): boolean
	local changed = false
	local stage, goals = Economy.stageProgress(p)
	local allDone = true
	for _, g in goals do
		if g.value >= g.goal.target and not p.career.claimed[g.key] then
			p.career.claimed[g.key] = true
			Economy.earn(p, g.goal.reward)
			Telemetry.economy(player, true, "Cash", g.goal.reward, p.cash, "GoalReward")
			toast(player, `Goal complete: {g.goal.label}, +{Format.money(g.goal.reward)}`, "goal")
			Remotes.Celebrate:FireClient(player, "reward", { amount = g.goal.reward, source = "goal" })
			Telemetry.funnel(player, 7, p)
			changed = true
		end
		if not p.career.claimed[g.key] then
			allDone = false
		end
	end
	if allDone and p.career.stage < #Career.stages then
		p.career.stage += 1
		local next = Career.stages[p.career.stage]
		local unlocks = {}
		for _, r in Rockets.list do
			if r.stage == p.career.stage then
				table.insert(unlocks, { kind = "rocket", id = r.id, name = r.name })
			end
		end
		for _, d in Destinations.list do
			if d.stage == p.career.stage then
				table.insert(unlocks, { kind = "dest", id = d.id, name = d.name })
			end
		end
		Remotes.Celebrate:FireClient(player, "stage", {
			name = next.name,
			blurb = next.blurb,
			stage = p.career.stage,
			unlocks = unlocks,
			from = stage.name,
		})
		if p.career.stage == 2 then
			Telemetry.funnel(player, 8, p)
		end
		changed = true
		careerCheck(player, p) -- goals of the new stage may already be met
	end
	return changed
end

-- One completed trip for a mission. Returns the trip result and any jackpot bonus (already paid).
local function completeTrip(player: Player, p: any, m: any): (Economy.Trip, number)
	local rocket = findById(p.rockets, m.rocket)
	local firstVisit = not p.stats.visited[m.dest]
	local t = Economy.trip(
		rocket.model,
		m.dest,
		m.fare,
		m.service,
		cashMult(player) * Progression.tripMult(m),
		Research.effects(p.research)
	)
	local bonus = Economy.jackpotBonus(t.profit, luck:NextNumber())
	Economy.earn(p, t.profit + bonus)
	Telemetry.accrue(player, "Trip", t.profit)
	if bonus > 0 then
		Telemetry.accrue(player, "Jackpot", bonus)
	end
	m.trips += 1
	m.earned += t.profit + bonus
	m.lastProfit = t.profit
	m.lastLoad = t.load
	rocket.trips += 1
	rocket.earned += t.profit
	p.stats.trips += 1
	p.stats.passengers += t.filled
	p.stats.visited[m.dest] = true
	Progression.onTrip(player, p, m, t, firstVisit)
	return t, bonus
end

local function schedule(player: Player, p: any, m: any, rocketModel: string, from: number)
	local sec = Economy.tripSeconds(rocketModel, m.dest, fast(player), Research.effects(p.research).speedMult)
	m.departAt = from
	m.arriveAt = from + sec
	m.thrusted = 0
end

-- ACTIONS ------------------------------------------------------------------------------------------

local actions: { [string]: (Player, any, ...any) -> (boolean, string?) } = {}

function actions.createAgency(player, p, name, color)
	if p.agency.name ~= "" then
		return false, "Agency already exists"
	end
	if type(name) ~= "string" or #name < 3 or #name > 24 or not name:match("^[%w %.%-'&]+$") then
		return false, "Use 3 to 24 letters, numbers or spaces"
	end
	if type(color) ~= "number" or color ~= math.floor(color) or color < 1 or color > #Tuning.agencyColors then
		return false, "Pick a colour"
	end
	local ok, filtered = pcall(function()
		return TextService:FilterStringAsync(name, player.UserId):GetNonChatStringForBroadcastAsync()
	end)
	if not ok or type(filtered) ~= "string" then
		return false, "Name check failed, try again"
	end
	if filtered:find("#") then
		return false, "Please choose a different name"
	end
	p.agency.name = filtered
	p.agency.color = color
	-- starter rocket
	table.insert(p.rockets, { id = "R1", model = Rockets.starter, tail = "001", trips = 0, earned = 0 })
	p.nextRocket = 2
	Telemetry.funnel(player, 2, p)
	return true, nil
end

function actions.buyRocket(player, p, modelId)
	local r = if type(modelId) == "string" then Rockets.byId[modelId] else nil
	if not r then
		return false, "Unknown rocket"
	end
	if not unlocked(p, r.stage) then
		return false, "Locked"
	end
	if p.cash < r.price then
		return false, "Not enough cash"
	end
	if #p.rockets >= 40 then
		return false, "Hangar full"
	end
	p.cash -= r.price
	local id = `R{p.nextRocket}`
	table.insert(
		p.rockets,
		{ id = id, model = r.id, tail = string.format("%03d", p.nextRocket), trips = 0, earned = 0 }
	)
	p.nextRocket += 1
	Telemetry.economy(player, false, "Cash", r.price, p.cash, "Rocket")
	if #p.rockets == 2 then
		Telemetry.funnel(player, 5, p)
	end
	Remotes.Celebrate:FireClient(player, "delivered", { rocket = id, model = r.id })
	return true, nil
end

function actions.planMission(player, p, destId, rocketId, fareId, serviceId)
	local d = if type(destId) == "string" then Destinations.byId[destId] else nil
	local rocket = if type(rocketId) == "string" then findById(p.rockets, rocketId) else nil
	if not d or not rocket then
		return false, "Pick a destination and rocket"
	end
	if not unlocked(p, d.stage) then
		return false, "Destination locked"
	end
	if rocket.mission then
		return false, "That rocket is already flying a mission"
	end
	if not Economy.canReach(rocket.model, d.id) then
		return false, "Out of range for this rocket"
	end
	if
		type(fareId) ~= "string"
		or not Economy.fare(fareId)
		or type(serviceId) ~= "string"
		or not Economy.service(serviceId)
	then
		return false, "Pick pricing"
	end
	local m = {
		id = `M{p.nextMission}`,
		dest = d.id,
		rocket = rocket.id,
		fare = fareId,
		service = serviceId,
		trips = 0,
		earned = 0,
		lastProfit = 0,
		lastLoad = 1,
		departAt = 0,
		arriveAt = 0,
		launch = "pending",
	}
	p.nextMission += 1
	schedule(player, p, m, rocket.model, now())
	rocket.mission = m.id
	table.insert(p.missions, m)
	p.stats.planned += 1
	Progression.onPlan(p)
	Telemetry.funnel(player, if p.stats.planned == 1 then 3 else 6, p)
	return true, nil
end

function actions.closeMission(_player, p, missionId)
	local m, i = findById(p.missions, missionId)
	if not m or not i then
		return false, "Unknown mission"
	end
	local rocket = findById(p.rockets, m.rocket)
	if rocket then
		rocket.mission = nil
	end
	table.remove(p.missions, i)
	return true, nil
end

function actions.claimDaily(player, p)
	local day = today()
	if p.daily.lastDay == day then
		return false, "Already claimed today"
	end
	p.daily.streak = if p.daily.lastDay == day - 1 then p.daily.streak + 1 else 1
	p.daily.lastDay = day
	local reward = Tuning.daily[((p.daily.streak - 1) % #Tuning.daily) + 1]
	Economy.earn(p, reward)
	Telemetry.economy(player, true, "Cash", reward, p.cash, "DailyReward")
	Remotes.Celebrate:FireClient(player, "reward", { amount = reward, source = "daily" })
	toast(player, `Day {((p.daily.streak - 1) % #Tuning.daily) + 1} reward: +{Format.money(reward)}`, "money")
	return true, nil
end

function actions.setFlag(player, p, key, value)
	if not Net.isEnum(key, { reducedMotion = true, sound = true }) or type(value) ~= "boolean" then
		return false, "Bad setting"
	end
	p.settings[key] = value
	player:SetAttribute(if key == "sound" then "Sound" else "ReducedMotion", value)
	return true, nil
end

-- Tap a flying rocket: its thrusters cut a little off this trip (capped per trip by Economy.thrust).
function actions.thrust(_player, p, missionId)
	local m = if type(missionId) == "string" and #missionId <= 12
		then findById(p.missions, missionId)
		else nil
	if not m then
		return false, nil
	end
	local t = now()
	local secs = Economy.thrust(m.arriveAt - t, m.arriveAt - m.departAt, m.thrusted or 0)
	if secs <= 0 then
		return false, nil
	end
	-- shift both ends so the flight keeps its length and the rocket visibly jumps ahead
	m.departAt -= secs
	m.arriveAt -= secs
	m.thrusted = (m.thrusted or 0) + secs
	return true, nil
end

function actions.seenTip(_player, p, tipId)
	if type(tipId) ~= "string" or #tipId > 24 then
		return false, nil
	end
	p.tips[tipId] = true
	return true, nil
end

for k, fn in Progression.actions do
	actions[k] = fn
end

-- LIFECYCLE ----------------------------------------------------------------------------------------

local function refreshPasses(player: Player)
	local owned = { doubleCash = false, fastLaunch = false }
	for key in owned do
		local pass = (Tuning.passes :: any)[key]
		if pass.id ~= 0 then
			local ok, has =
				pcall(MarketplaceService.UserOwnsGamePassAsync, MarketplaceService, player.UserId, pass.id)
			owned[key] = ok and has == true
		end
	end
	passes[player] = owned
end

-- Offline catch-up: credit trips completed while away (capped), then show a Welcome summary.
local function catchUp(player: Player, p: any)
	local t = now()
	local away = if p.lastSeen > 0 then t - p.lastSeen else 0
	local windowEnd = math.min(t, (if p.lastSeen > 0 then p.lastSeen else t) + Tuning.offlineCapSeconds)
	local earned, trips, pax = 0, 0, 0
	for _, m in p.missions do
		local rocket = findById(p.rockets, m.rocket)
		if rocket then
			local sec = Economy.tripSeconds(
				rocket.model,
				m.dest,
				fast(player),
				Research.effects(p.research).speedMult
			)
			local n = Economy.tripsBetween(m.arriveAt, m.departAt, windowEnd, sec)
			n = math.min(n, 2000)
			for _ = 1, n do
				local r, bonus = completeTrip(player, p, m)
				earned += r.profit + bonus
				trips += 1
				pax += r.filled
			end
			schedule(player, p, m, rocket.model, t)
		end
	end
	if p.lastSeen > 0 and away > 60 and #p.missions > 0 then
		Remotes.Welcome:FireClient(player, {
			away = away,
			earned = earned,
			trips = trips,
			passengers = pax,
			capped = away > Tuning.offlineCapSeconds,
		})
		Telemetry.funnel(player, 9, p)
	end
end

-- PURCHASES ----------------------------------------------------------------------------------------

local function grantServerBoost(buyer: Player)
	local minutes = Tuning.products.serverBoost.minutes
	-- Stacks onto a running boost: the timer only ever extends, never restarts.
	local from = math.max(now(), workspace:GetAttribute("BoostUntil") or 0)
	workspace:SetAttribute("BoostUntil", from + minutes * 60)
	for _, pl in Players:GetPlayers() do
		toast(pl, `{buyer.DisplayName} started a Server Boost: 2x cash for {minutes} min!`, "milestone")
		AgencyService.push(pl)
	end
end

local productGrants: { [number]: (Player) -> () } = {}
if Tuning.products.serverBoost.id ~= 0 then
	productGrants[Tuning.products.serverBoost.id] = grantServerBoost
end

-- The only ProcessReceipt. Idempotent by receipt key: grant, then save, then report granted.
local function processReceipt(info: any): Enum.ProductPurchaseDecision
	local player = Players:GetPlayerByUserId(info.PlayerId)
	local p = if player then DataService.get(player) else nil
	if not player or not p then
		return Enum.ProductPurchaseDecision.NotProcessedYet -- Roblox retries, e.g. on their next join
	end
	local key = Receipts.key(info.PlayerId, info.PurchaseId)
	if not Receipts.seen(p.receipts, key) then
		local grant = productGrants[info.ProductId]
		if not grant then
			warn("[AgencyService] no grant for product ", info.ProductId)
			return Enum.ProductPurchaseDecision.NotProcessedYet
		end
		local ok, err = pcall(function()
			grant(player :: Player)
		end)
		if not ok then
			warn("[AgencyService] grant failed: ", err)
			return Enum.ProductPurchaseDecision.NotProcessedYet
		end
		Receipts.record(p.receipts, key, os.time())
		Telemetry.custom(player, "ProductBought", info.CurrencySpent)
		StatsService.robux(player, info.ProductId, info.CurrencySpent) -- read-only: aggregate Robux, grants nothing
	end
	if not DataService.save(player) then
		-- The receipt is recorded in memory, so a retry in this server won't grant twice.
		return Enum.ProductPurchaseDecision.NotProcessedYet
	end
	return Enum.ProductPurchaseDecision.PurchaseGranted
end

function AgencyService.start()
	Remotes.Act.OnServerInvoke = function(player: Player, action: any, ...: any)
		if action == "thrust" then
			if not allowThrust(player) then
				return false, nil -- silent: a fast tapper just loses the extra taps
			end
		elseif not allowAct(player) then
			return false, "Slow down"
		end
		local p = DataService.peek(player)
		local handler = if type(action) == "string" then actions[action] else nil
		if not p or not ready[player] or not handler then
			return false, "Not ready"
		end
		if action ~= "createAgency" and p.agency.name == "" then
			return false, "Create your agency first"
		end
		StatsService.action(player, tostring(action)) -- read-only: remembers the last thing the player did
		local ok, result, message = pcall(handler, player, p, ...)
		if not ok then
			warn("[AgencyService] action failed: ", action, result)
			return false, "Something went wrong"
		end
		if result then
			careerCheck(player, p)
			AgencyService.push(player)
		end
		return result, message
	end

	local function onPlayer(player: Player)
		local p = DataService.get(player)
		if not p then
			return
		end
		refreshPasses(player)
		catchUp(player, p)
		careerCheck(player, p)
		ready[player] = true
		Telemetry.funnel(player, 1, p)
		AgencyService.push(player)
	end
	Players.PlayerAdded:Connect(onPlayer)
	for _, pl in Players:GetPlayers() do
		task.spawn(onPlayer, pl)
	end
	Players.PlayerRemoving:Connect(function(player)
		local p = DataService.peek(player)
		if p then
			p.lastSeen = now()
			Telemetry.flush(player, "Cash", p.cash)
		end
		ready[player] = nil
		passes[player] = nil
	end)
	MarketplaceService.PromptGamePassPurchaseFinished:Connect(function(player, _, bought)
		if bought then
			refreshPasses(player)
			AgencyService.push(player)
		end
	end)

	MarketplaceService.ProcessReceipt = processReceipt

	-- Batched trip income goes to analytics about once a minute.
	task.spawn(function()
		while true do
			task.wait(60)
			for player in ready do
				local p = DataService.peek(player)
				if p then
					Telemetry.flush(player, "Cash", p.cash)
				end
			end
		end
	end)

	-- Mission clock: arrivals pay out and the rocket turns around.
	local lastTick = now()
	task.spawn(function()
		while true do
			task.wait(0.25)
			local t = now()
			local dt = t - lastTick
			lastTick = t
			for player in ready do
				local p = DataService.peek(player)
				if p then
					local changed = false
					p.lastSeen = t
					Progression.tick(p, dt)
					for _, m in p.missions do
						if t >= m.arriveAt then
							local rocket = findById(p.rockets, m.rocket)
							if rocket then
								local r, bonus = completeTrip(player, p, m)
								schedule(player, p, m, rocket.model, m.arriveAt + Tuning.turnaroundSeconds)
								if p.stats.trips == 1 then
									Telemetry.funnel(player, 4, p)
								end
								Remotes.Toast:FireClient(
									player,
									`{Destinations.byId[m.dest].code} arrival, +{Format.money(
										r.profit + bonus
									)}`,
									"arrival"
								)
								Remotes.Celebrate:FireClient(
									player,
									"arrival",
									{ dest = m.dest, profit = r.profit, jackpot = bonus }
								)
								if p.stats.trips % 100 == 0 then
									toast(
										player,
										`{Format.int(p.stats.trips)}th trip! Your agency is growing fast.`,
										"milestone"
									)
								end
								changed = true
							end
						end
					end
					if changed then
						careerCheck(player, p)
						AgencyService.push(player)
					end
				end
			end
		end
	end)
end

return AgencyService
