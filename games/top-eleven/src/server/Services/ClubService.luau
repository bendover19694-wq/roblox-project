--!strict
-- The single Act remote: rate limit, run the pure action, then save / celebrate / push. Also join catch-up,
-- State pushes and the only ProcessReceipt. Rules live in shared/Actions.luau.

local MarketplaceService = game:GetService("MarketplaceService")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Actions = require(ReplicatedStorage.Shared.Actions)
local Net = require(ReplicatedStorage.Shared.Net)
local Receipts = require(ReplicatedStorage.Shared.Receipts)
local Remotes = require(ReplicatedStorage.Shared.Remotes)
local Settle = require(ReplicatedStorage.Shared.Settle)
local View = require(ReplicatedStorage.Shared.View)
local DataService = require(script.Parent.DataService)
local MatchService = require(script.Parent.MatchService)
local Telemetry = require(script.Parent.Telemetry)

local ClubService = {}

local allowAct = Net.limiter(8, 12)
local allowDevice = Net.limiter(0.2, 2)
local DEVICES: { [string]: boolean } = { phone = true, tablet = true, pc = true, console = true }
local SAVE_AFTER: { [string]: boolean } = {
	createClub = true,
	nextSeason = true,
	buyPlayer = true,
	sellPlayer = true,
	upgradeFacility = true,
	startTraining = true,
	promote = true,
}
local FUNNEL_AFTER: { [string]: number } = {
	createClub = 2,
	playMatch = 4,
	scout = 6,
	startTraining = 7,
	claimTraining = 8,
	upgradeFacility = 9,
	nextSeason = 10,
}
local SAVE_GAP = 6 -- seconds; keeps a button-masher from hammering the DataStore

local ready: { [Player]: boolean } = {}
local lastSave: { [Player]: number } = {}

local function now(): number
	return workspace:GetServerTimeNow()
end

local function utcDay(): number
	return math.floor(os.time() / 86400)
end

function ClubService.isReady(player: Player): boolean
	return ready[player] == true
end

function ClubService.push(player: Player)
	local p = DataService.peek(player)
	if not p then
		return
	end
	local view = View.of(p, {
		now = now(),
		canSave = player:GetAttribute("CanSave") ~= false,
		day = utcDay(),
		userId = player.UserId,
	})
	Remotes.State:FireClient(player, view)
end

local function saveSoon(player: Player)
	local t = os.clock()
	if t - (lastSave[player] or -math.huge) >= SAVE_GAP then
		lastSave[player] = t
		task.spawn(DataService.save, player)
	end
end

-- No product is approved yet (design doc: cosmetics or convenience only, never odds or strength).
local productGrants: { [number]: (Player) -> () } = {}

-- The only ProcessReceipt. Idempotent by receipt key: grant, then save, then report granted.
local function processReceipt(info: any): Enum.ProductPurchaseDecision
	local player = Players:GetPlayerByUserId(info.PlayerId)
	local p = if player then DataService.get(player) else nil
	if not player or not p then
		return Enum.ProductPurchaseDecision.NotProcessedYet
	end
	local key = Receipts.key(info.PlayerId, info.PurchaseId)
	if not Receipts.seen(p.receipts, key) then
		local grant = productGrants[info.ProductId]
		if not grant then
			warn("[ClubService] no grant for product ", info.ProductId)
			return Enum.ProductPurchaseDecision.NotProcessedYet
		end
		local ok, err = pcall(function()
			grant(player)
		end)
		if not ok then
			warn("[ClubService] grant failed: ", err)
			return Enum.ProductPurchaseDecision.NotProcessedYet
		end
		Receipts.record(p.receipts, key, os.time())
		Telemetry.custom(player, "ProductBought", info.CurrencySpent)
	end
	if not DataService.save(player) then
		return Enum.ProductPurchaseDecision.NotProcessedYet
	end
	return Enum.ProductPurchaseDecision.PurchaseGranted
end

local function onAct(player: Player, action: any, ...: any): (boolean, string?)
	if not allowAct(player) then
		return false, "Slow down"
	end
	local p = DataService.peek(player)
	if not p or not ready[player] then
		return false, "Not ready"
	end
	local args = table.pack(...)
	local ok, result, message, events = pcall(function()
		MatchService.settle(player, p) -- bring a finished match up to date before the action
		return Actions.run(p, action, args, {
			now = now(),
			day = utcDay(),
			userId = player.UserId,
			randomInt = function(lo: number, hi: number)
				return Random.new():NextInteger(lo, hi)
			end,
		})
	end)
	if not ok then
		warn("[ClubService] action failed: ", action, result)
		return false, "Something went wrong"
	end
	if result then
		local step = FUNNEL_AFTER[action :: string]
		if step then
			Telemetry.funnel(player, step, p)
		end
		for _, ev in (events or {}) :: { Actions.Event } do
			Remotes.Celebrate:FireClient(player, ev.kind, ev.data)
			if ev.kind == "fullTime" then
				Telemetry.funnel(player, 5, p)
				saveSoon(player)
			elseif ev.kind == "season" and (ev.data.outcome == "up" or ev.data.outcome == "champion") then
				Telemetry.funnel(player, 11, p)
			end
		end
		if SAVE_AFTER[action :: string] then
			saveSoon(player)
		end
		ClubService.push(player)
	end
	return result, message
end

local function onPlayer(player: Player)
	local p = DataService.get(player)
	if not p then
		return
	end
	local summary = Settle.catchUp(p, now())
	if p.telemetry.firstDay == 0 then
		p.telemetry.firstDay = utcDay()
	end
	ready[player] = true
	Telemetry.funnel(player, 1, p)
	ClubService.push(player)
	if summary then
		Remotes.Welcome:FireClient(player, summary)
		if summary.seconds >= 3600 then
			Telemetry.funnel(player, 12, p)
		end
		if summary.matchFinished then
			Remotes.Celebrate:FireClient(player, "fullTime", summary.matchFinished)
			Telemetry.funnel(player, 5, p)
		end
	end
end

function ClubService.start()
	Remotes.Act.OnServerInvoke = onAct
	Remotes.Device.OnServerEvent:Connect(function(player: Player, class: any)
		if allowDevice(player) and Net.isEnum(class, DEVICES) then
			Telemetry.custom(player, `Device_{class}`)
		end
	end)
	Players.PlayerAdded:Connect(onPlayer)
	for _, pl in Players:GetPlayers() do
		task.spawn(onPlayer, pl)
	end
	Players.PlayerRemoving:Connect(function(player)
		local p = DataService.peek(player)
		if p then
			p.lastSeen = now()
		end
		ready[player] = nil
		lastSave[player] = nil
	end)
	MarketplaceService.ProcessReceipt = processReceipt
	-- lastSeen is the offline clock: keep it fresh, because the leave handler may run after the final save
	task.spawn(function()
		while true do
			task.wait(30)
			for player in ready do
				local p = DataService.peek(player)
				if p then
					p.lastSeen = now()
				end
			end
		end
	end)
end

return ClubService
