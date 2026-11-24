--!strict
-- The core loop on the server: tap and auto-clip, post for cash and followers, buy upgrades,
-- rebirth for Clout. The server owns every number; the client only asks.

local AnalyticsService = game:GetService("AnalyticsService")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Config = require(ReplicatedStorage.Shared.Config)
local Economy = require(ReplicatedStorage.Shared.Economy)
local Net = require(ReplicatedStorage.Shared.Net)
local Remotes = require(ReplicatedStorage.Shared.Remotes)
local DataService = require(script.Parent.DataService)

local GameService = {}

local rng = Random.new()
local tapLimit, forgetTap = Net.limiter(4, 6) -- tap batches per second (client sends ~2/s)
local actLimit, forgetAct = Net.limiter(6, 10)
local SETTINGS = { reducedMotion = true, sound = true }
local ACTIONS = { post = true, buy = true, rebirth = true, setting = true, tutorialDone = true }

-- Per-player session state that is never saved.
type Session = {
	tapBudget: number,
	budgetAt: number,
	dirty: boolean,
	zone: number,
	funnel: { [string]: boolean },
}
local sessions: { [Player]: Session } = {}

local FUNNEL =
	{ "joined", "first_tap", "first_post", "first_upgrade", "zone_2", "first_rebirth", "tutorial_skipped" }
-- Steps that only mean "first ever" while the tutorial is still running (veterans would re-fire them).
local TUTORIAL_STEPS = { first_tap = true, first_post = true, first_upgrade = true }

local function funnel(player: Player, step: string)
	local s = sessions[player]
	if not s or s.funnel[step] then
		return
	end
	local p = DataService.peek(player)
	if TUTORIAL_STEPS[step] and p and p.tutorialDone then
		return
	end
	if step == "first_rebirth" and p and p.rebirths ~= 1 then
		return
	end
	s.funnel[step] = true
	local index = table.find(FUNNEL, step) or 0
	print(`[Funnel] {player.Name} {index} {step}`)
	pcall(function()
		AnalyticsService:LogOnboardingFunnelStepEvent(player, index, step)
	end)
end

-- Zone the character stands in, limited to what the player has unlocked.
local function currentZone(player: Player, p: Economy.Profile): number
	local unlocked = Economy.unlockedZone(p.followers)
	local char = player.Character
	-- lihfolk-ignore: findfirstchild-chain (result is nil-checked on the next line)
	local root = char and char:FindFirstChild("HumanoidRootPart") :: BasePart?
	if not root then
		return 1
	end
	local at = Economy.zoneAt(root.Position.X, root.Position.Z)
	return math.clamp(at or 1, 1, unlocked)
end

local function view(player: Player, p: Economy.Profile)
	local s = sessions[player]
	local hypeOn, hypeLeft = Economy.hype(os.time())
	local zone = s and s.zone or 1
	local costs = {}
	for id in Config.UPGRADES do
		costs[id] = Economy.nextCost(p, id) or -1 -- -1 = maxed (remotes drop nil holes)
	end
	return {
		cash = p.cash,
		clips = p.clips,
		capacity = Economy.capacity(p),
		followers = p.followers,
		clout = p.clout,
		rebirths = p.rebirths,
		rebirthCost = Economy.rebirthCost(p),
		levels = p.levels,
		costs = costs,
		tapPower = Economy.tapPower(p),
		autoRate = Economy.autoRate(p),
		viralChance = Economy.viralChance(p),
		clipValue = Economy.clipValue(p, zone, hypeOn),
		zone = zone,
		unlocked = Economy.unlockedZone(p.followers),
		hypeOn = hypeOn,
		hypeLeft = hypeLeft,
		tutorialDone = p.tutorialDone,
		canSave = player:GetAttribute("CanSave") == true,
		settings = p.settings,
	}
end

local function push(player: Player)
	local p = DataService.peek(player)
	if p then
		Remotes.State:FireClient(player, view(player, p))
	end
end

local function markDirty(player: Player)
	local s = sessions[player]
	if s then
		s.dirty = true
	end
end

function GameService.post(player: Player, p: Economy.Profile): (boolean, string?)
	if p.clips < 1 then
		return false, "No clips yet. Tap CLIP first"
	end
	local s = sessions[player]
	local zone = s and s.zone or 1
	local hypeOn = Economy.hype(os.time())
	local cash, followers, viral = Economy.post(p, zone, hypeOn, rng:NextNumber())
	local before = Economy.unlockedZone(p.followers - followers)
	Remotes.Celebrate:FireClient(player, "post", { cash = cash, followers = followers, viral = viral })
	local after = Economy.unlockedZone(p.followers)
	if after > before then
		Remotes.Celebrate:FireClient(player, "zone", { index = after })
		if after >= 2 then
			funnel(player, "zone_2")
		end
	end
	funnel(player, "first_post")
	markDirty(player)
	return true, nil
end

local handlers: { [string]: (Player, Economy.Profile, any) -> (boolean, string?) } = {
	post = function(player, p)
		return GameService.post(player, p)
	end,
	buy = function(player, p, id)
		if not Net.isEnum(id, Config.UPGRADE_IDS) then
			return false, "Bad upgrade"
		end
		local ok, why = Economy.buy(p, id)
		if ok then
			funnel(player, "first_upgrade")
			markDirty(player)
		end
		return ok, why
	end,
	rebirth = function(player, p)
		local ok, why = Economy.rebirth(p)
		if ok then
			Remotes.Celebrate:FireClient(player, "rebirth", { clout = p.clout })
			funnel(player, "first_rebirth")
			markDirty(player)
			task.spawn(DataService.save, player) -- checkpoint a big reset right away
		end
		return ok, why
	end,
	setting = function(player, p, name)
		if not Net.isEnum(name, SETTINGS) then
			return false, "Bad setting"
		end
		local settings = p.settings :: any
		settings[name] = not settings[name]
		player:SetAttribute(if name == "reducedMotion" then "ReducedMotion" else "Sound", settings[name])
		markDirty(player)
		return true, nil
	end,
	tutorialDone = function(player, p, how)
		if how == "skip" and not p.tutorialDone then
			funnel(player, "tutorial_skipped")
		end
		p.tutorialDone = true
		markDirty(player)
		return true, nil
	end,
}

local function onAct(player: Player, action: any, arg: any): (boolean, string?)
	if not actLimit(player) then
		return false, "Slow down"
	end
	if not Net.isEnum(action, ACTIONS) then
		return false, "Bad action"
	end
	local p = DataService.peek(player)
	if not p then
		return false, "Loading"
	end
	local ran, ok, why = pcall(handlers[action], player, p, arg)
	if not ran then
		warn(`[GameService] {action} failed: {ok}`)
		ok, why = false, "Something went wrong. Try again"
	end
	push(player)
	return ok, why
end

local function onTap(player: Player, count: any)
	if not tapLimit(player) or not Net.isInt(count, 1, Config.TAP_BATCH_MAX) then
		return
	end
	local p = DataService.peek(player)
	local s = sessions[player]
	if not p or not s then
		return
	end
	-- Budget refills at the human tap ceiling; anything above it is dropped.
	local now = os.clock()
	s.tapBudget =
		math.min(Config.TAP_PER_SECOND_CAP * 2, s.tapBudget + (now - s.budgetAt) * Config.TAP_PER_SECOND_CAP)
	s.budgetAt = now
	local taps = math.min(count, math.floor(s.tapBudget))
	if taps <= 0 then
		return
	end
	s.tapBudget -= taps
	if Economy.addClips(p, taps * Economy.tapPower(p)) > 0 then
		funnel(player, "first_tap")
		markDirty(player)
	end
end

function GameService.start()
	Remotes.Act.OnServerInvoke = onAct
	Remotes.Tap.OnServerEvent:Connect(onTap)

	Players.PlayerAdded:Connect(function(player)
		sessions[player] = { tapBudget = 0, budgetAt = os.clock(), dirty = true, zone = 1, funnel = {} }
		funnel(player, "joined")
		task.spawn(function()
			DataService.get(player) -- waits for load
			push(player)
		end)
	end)
	for _, player in Players:GetPlayers() do
		sessions[player] = { tapBudget = 0, budgetAt = os.clock(), dirty = true, zone = 1, funnel = {} }
	end
	Players.PlayerRemoving:Connect(function(player)
		sessions[player] = nil
		forgetTap(player)
		forgetAct(player)
	end)
	DataService.swapped:Connect(function(player)
		Remotes.Toast:FireClient(player, "Your save loaded. Welcome back!", "info")
		push(player)
	end)

	-- One shared loop: auto clips, zone tracking, auto post, state push when changed.
	task.spawn(function()
		local lastHype = Economy.hype(os.time())
		while true do
			local dt = task.wait(Config.AUTO_TICK)
			local hypeOn = Economy.hype(os.time())
			local hypeChanged = hypeOn ~= lastHype
			if hypeChanged and hypeOn then
				Remotes.Toast:FireAllClients(
					`{Config.HYPE_GAME} TRAILER DROP! Clips pay x{Config.HYPE_MULT}`,
					"hype"
				)
			end
			lastHype = hypeOn
			for player, s in sessions do
				local p = DataService.peek(player)
				if p then
					local zone = currentZone(player, p)
					if zone ~= s.zone then
						s.zone = zone
						s.dirty = true
					end
					local rate = Economy.autoRate(p)
					if rate > 0 and Economy.addClips(p, rate * dt) > 0 then
						s.dirty = true
					end
					if (p.levels.autoPost or 0) > 0 and p.clips >= Economy.capacity(p) then
						GameService.post(player, p)
					end
					if s.dirty or hypeChanged then
						s.dirty = false
						push(player)
					end
				end
			end
		end
	end)
end

return GameService
