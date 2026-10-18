--!strict
-- Coins, XP, rank, Logbook, one-time tips, and the onboarding funnel. Server-authoritative.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Payout = require(ReplicatedStorage.Shared.Payout)
local Remotes = require(ReplicatedStorage.Shared.Remotes)
local Tips = require(ReplicatedStorage.Shared.Config.Tips)
local DataService = require(script.Parent.DataService)
local NightStats = require(script.Parent.NightStats)
local Telemetry = require(script.Parent.Telemetry)

local ProgressionService = {}

local friendCache: { [string]: boolean } = {}

local function today(): number
	return math.floor(os.time() / 86400)
end

local function logbookCount(profile): number
	local n = 0
	for _ in profile.logbook do
		n += 1
	end
	return n
end

function ProgressionService.push(player: Player)
	local profile = DataService.peek(player)
	if not profile then
		return
	end
	local rank, progress = Payout.rankFor(profile.xp)
	Remotes.Profile:FireClient(player, {
		coins = profile.coins,
		rank = rank,
		title = Payout.titleFor(rank),
		progress = progress,
		logbook = logbookCount(profile),
		canSave = player:GetAttribute("CanSave") == true,
	})
end

function ProgressionService.tip(player: Player, id: string)
	local profile = DataService.peek(player)
	if not profile or profile.tips[id] then
		return
	end
	profile.tips[id] = true
	Remotes.Tip:FireClient(player, (Tips :: any)[id])
end

function ProgressionService.tipAll(id: string)
	for _, p in Players:GetPlayers() do
		ProgressionService.tip(p, id)
	end
end

function ProgressionService.funnel(player: Player, step: number)
	local profile = DataService.peek(player)
	if profile then
		Telemetry.funnel(player, step, profile)
	end
end

function ProgressionService.funnelAll(step: number)
	for _, p in Players:GetPlayers() do
		ProgressionService.funnel(p, step)
	end
end

-- Stamps Logbook entries for everyone present. Returns nothing; new stamps are counted on the HUD.
function ProgressionService.stamp(entries: { string })
	for _, player in Players:GetPlayers() do
		local profile = DataService.peek(player)
		if profile then
			local added = false
			for _, id in entries do
				if not profile.logbook[id] then
					profile.logbook[id] = os.time()
					added = true
				end
			end
			if added then
				ProgressionService.tip(player, "logbook")
				ProgressionService.push(player)
			end
		end
	end
end

local function friendsHere(player: Player): number
	local n = 0
	for _, other in Players:GetPlayers() do
		if other ~= player then
			local k = `{math.min(player.UserId, other.UserId)}_{math.max(player.UserId, other.UserId)}`
			if friendCache[k] == nil then
				local ok, result = pcall(player.IsFriendsWithAsync, player, other.UserId)
				friendCache[k] = ok and result == true
			end
			if friendCache[k] then
				n += 1
			end
		end
	end
	return n
end

-- Dawn payout for everyone present.
function ProgressionService.payNight(failed: boolean, nightNumber: number)
	for _, player in Players:GetPlayers() do
		local profile = DataService.peek(player)
		if profile then
			local s = NightStats.of(player)
			local first = profile.firstNightDay ~= today()
			local coins, xp, clamped = Payout.night({
				crewCorrect = NightStats.crewCorrect,
				correct = s.correct,
				crates = s.crates,
				nets = s.nets,
				failed = failed,
				friends = friendsHere(player),
				firstNightToday = first,
			})
			if clamped then
				Telemetry.custom(player, "econ_clamp", coins)
			end
			local rankBefore = Payout.rankFor(profile.xp)
			profile.coins += coins
			profile.xp += xp
			profile.stats.nights += 1
			profile.stats.correct += s.correct
			if first then
				profile.firstNightDay = today()
			end
			local rankAfter = Payout.rankFor(profile.xp)
			Telemetry.economy(player, true, "Coins", coins, profile.coins, "NightPayout")
			Telemetry.night(
				player,
				if failed then Enum.AnalyticsProgressionType.Fail else Enum.AnalyticsProgressionType.Complete,
				nightNumber
			)
			player:SetAttribute(
				"LastPayout",
				`+{coins} coins · +{xp} XP{if first then " (first night today ×2)" else ""}`
			)
			if rankAfter > rankBefore then
				Remotes.Celebrate:FireClient(player, `Rank {rankAfter}!`, Payout.titleFor(rankAfter))
			end
			ProgressionService.push(player)
			task.spawn(DataService.save, player)
		end
	end
end

return ProgressionService
