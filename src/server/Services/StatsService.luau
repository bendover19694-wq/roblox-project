--!strict
-- Live telemetry, server side. Folds joins, leaves, purchases, errors and performance into LiveStats aggregates
-- and writes them to the HQStats DataStore every Tuning.stats.flushSeconds, where Agent HQ reads them.
--   key "day-YYYY-MM-DD"  { date, stats }   this server's delta merged into the UTC day's record
--   key "live"            { at, servers }   one summary line per running server
-- Aggregates only: no user id is ever written (see LiveStats). Read-only: it never grants anything, never blocks
-- gameplay, and every call to Roblox services is pcall'd. Unpublished places and Studio simply fail to write.

local DataStoreService = game:GetService("DataStoreService")
local LocalizationService = game:GetService("LocalizationService")
local MarketplaceService = game:GetService("MarketplaceService")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local ScriptContext = game:GetService("ScriptContext")

local LiveStats = require(ReplicatedStorage.Shared.LiveStats)
local Net = require(ReplicatedStorage.Shared.Net)
local Remotes = require(ReplicatedStorage.Shared.Remotes)
local Tuning = require(ReplicatedStorage.Shared.Config.Tuning)
local DataService = require(script.Parent.DataService)
local Telemetry = require(script.Parent.Telemetry)

local StatsService = {}

local JOB = if game.JobId ~= "" then game.JobId else "studio"
local DEVICES = { phone = true, tablet = true, pc = true, console = true }
local MAX_AGE_DAYS = 3650

local agg = LiveStats.new(os.time, JOB, tostring(game.PlaceVersion))
local allowDevice = Net.limiter(0.2, 2)

-- per player, memory only
local devices: { [Player]: string } = {}
local joinedAt: { [Player]: number } = {}
local lastAction: { [Player]: string } = {}
local funnelStep: { [Player]: number } = {}
local counted: { [Player]: boolean } = {}

local store: DataStore? = nil
do
	local ok, result = pcall(function()
		return DataStoreService:GetDataStore(Tuning.stats.storeName)
	end)
	if ok then
		store = result
	end
end
local writesDisabled = false -- Studio without API access: every write would fail the same way
local warned = false

local function warnOnce(message: string, detail: any)
	if not warned then
		warned = true
		warn("[StatsService] ", message, detail)
	end
end

-- ---- where the player came from, and whether they are new ----

local function sourceOf(player: Player): string
	local ok, data = pcall(function()
		return player:GetJoinData()
	end)
	if ok and type(data) == "table" then
		local join = data :: any
		if type(join.ReferredByPlayerId) == "number" and join.ReferredByPlayerId ~= 0 then
			return "friend"
		end
		if type(join.SourcePlaceId) == "number" then
			return "teleport"
		end
	end
	return "direct"
end

-- (isNew, whole days since the first join or nil when unknown, acquisition source). Stamps a brand-new profile
-- with its first day and source. A player saved before this feature existed is returning with an unknown age.
local function classify(p: any, player: Player): (boolean, number?, string)
	local t = p.telemetry
	local today = math.floor(os.time() / 86400)
	if type(t.firstDay) == "number" and t.firstDay > 0 then
		local days = math.clamp(today - t.firstDay, 0, MAX_AGE_DAYS)
		local source = if type(t.source) == "string" and t.source ~= "" then t.source else "direct"
		return false, days, source
	end
	local seenBefore = p.lastSeen > 0 or p.agency.name ~= ""
	if seenBefore then
		return false, nil, "direct"
	end
	local source = sourceOf(player)
	t.firstDay = today
	t.source = source
	return true, 0, source
end

local function waitForDevice(player: Player): string
	local deadline = os.clock() + Tuning.stats.deviceWaitSeconds
	while devices[player] == nil and player.Parent and os.clock() < deadline do
		task.wait(0.25)
	end
	return devices[player] or "unknown"
end

local function countryOf(player: Player): string
	local ok, region = pcall(function()
		return LocalizationService:GetCountryRegionForPlayerAsync(player)
	end)
	return if ok and type(region) == "string" and region ~= "" then region else "unknown"
end

local function onPlayer(player: Player)
	joinedAt[player] = os.time()
	local p = DataService.get(player) -- waits for the profile
	if not p or not player.Parent then
		return
	end
	local device = waitForDevice(player)
	if not player.Parent then
		return
	end
	local isNew, days, source = classify(p, player)
	funnelStep[player] = p.funnel
	counted[player] = true
	LiveStats.join(agg, {
		userId = player.UserId,
		isNew = isNew,
		source = source,
		device = device,
		country = countryOf(player),
		language = player.LocaleId,
		version = tostring(game.PlaceVersion),
		daysSinceFirst = days,
	})
end

local function onLeaving(player: Player)
	if counted[player] then
		local step = funnelStep[player]
		LiveStats.leave(agg, {
			userId = player.UserId,
			sessionSeconds = os.time() - (joinedAt[player] or os.time()),
			lastPlace = lastAction[player],
			-- only while the player is still being onboarded, so the board shows where new players give up
			tutorialStep = if step ~= nil and step < #Telemetry.FUNNEL then step else nil,
		})
	end
	devices[player] = nil
	joinedAt[player] = nil
	lastAction[player] = nil
	funnelStep[player] = nil
	counted[player] = nil
end

-- ---- hooks the rest of the server calls (all read-only) ----

-- The last action a player took. It becomes "where players leave" when they quit.
function StatsService.action(player: Player, action: string)
	lastAction[player] = action
end

local productNames: { [number]: string } = {}
for key, product in Tuning.products :: any do
	if product.id ~= 0 then
		productNames[product.id] = product.name or key
	end
end

-- Robux spent on a developer product. Called from the existing receipt path after the grant; grants nothing.
function StatsService.robux(player: Player, productId: number, amount: number)
	local ok, err = pcall(function()
		LiveStats.robux(agg, {
			userId = player.UserId,
			product = productNames[productId] or `product {productId}`,
			amount = amount,
		})
	end)
	if not ok then
		warn("[StatsService] robux not counted: ", err)
	end
end

-- ---- writing to the DataStore ----

local function updateBudget(): number
	local ok, n = pcall(function()
		return DataStoreService:GetRequestBudgetForRequestType(Enum.DataStoreRequestType.UpdateAsync)
	end)
	return if ok then n else 0
end

local frames, elapsed = 0, 0

local function samplePerformance()
	local fps: number? = if elapsed > 0 then frames / elapsed else nil
	frames, elapsed = 0, 0
	local worst = 0
	for _, player in Players:GetPlayers() do
		local ok, ping = pcall(function()
			return player:GetNetworkPing()
		end)
		if ok and ping * 1000 > worst then
			worst = ping * 1000
		end
	end
	LiveStats.perf(agg, { fps = fps, ping = if worst > 0 then worst else nil })
end

local function write(key: string, transform: (any) -> any): boolean
	local s = store
	if not s then
		return false
	end
	local ok, err = pcall(function()
		s:UpdateAsync(key, transform)
	end)
	if not ok then
		if tostring(err):find("StudioAccessToApisNotAllowed", 1, true) then
			writesDisabled = true
		end
		warnOnce("write failed: ", err)
	end
	return ok
end

local function flush(): boolean
	samplePerformance()
	if writesDisabled or not store or updateBudget() < Tuning.stats.minBudget then
		return false -- keep the delta in memory; gameplay saves come first
	end
	local now = os.time()
	local date = os.date("!%Y-%m-%d", now)
	local delta = LiveStats.drain(agg, now)
	-- The transform can run more than once, so it always starts from a fresh record and merges the same delta.
	local ok = write(`day-{date}`, function(old: any)
		local stats = LiveStats.emptyStats()
		if type(old) == "table" then
			LiveStats.merge(stats, old.stats)
		end
		LiveStats.merge(stats, delta)
		return { date = date, stats = stats }
	end)
	if not ok then
		LiveStats.requeue(agg, delta)
	end
	write("live", function(old: any)
		return LiveStats.mergeLive(old, JOB, LiveStats.serverSummary(agg, now), now)
	end)
	return ok
end

function StatsService.start()
	Remotes.Device.OnServerEvent:Connect(function(player: Player, class: any)
		if not allowDevice(player) or not Net.isEnum(class, DEVICES) then
			return
		end
		devices[player] = class :: string
	end)

	Telemetry.observeFunnel(function(player: Player, step: number)
		funnelStep[player] = step
	end)

	-- Developer products are counted from the receipt path (StatsService.robux). Game passes have no receipt, so
	-- count them here, once, when Roblox says the purchase finished.
	MarketplaceService.PromptGamePassPurchaseFinished:Connect(
		function(player: Player, passId: number, bought: boolean)
			if not bought then
				return
			end
			for _, pass in Tuning.passes :: any do
				if pass.id ~= 0 and pass.id == passId then
					LiveStats.robux(agg, { userId = player.UserId, product = pass.name, amount = pass.price })
				end
			end
		end
	)

	ScriptContext.Error:Connect(function(message: string)
		LiveStats.error(agg, { message = message })
	end)

	RunService.Heartbeat:Connect(function(dt: number)
		frames += 1
		elapsed += dt
	end)

	Players.PlayerAdded:Connect(function(player)
		task.spawn(onPlayer, player)
	end)
	for _, player in Players:GetPlayers() do
		task.spawn(onPlayer, player)
	end
	Players.PlayerRemoving:Connect(onLeaving)

	task.spawn(function()
		while true do
			task.wait(Tuning.stats.flushSeconds)
			local ok, err = pcall(flush)
			if not ok then
				warn("[StatsService] flush failed: ", err)
			end
		end
	end)
	game:BindToClose(function()
		pcall(flush)
	end)
end

return StatsService
