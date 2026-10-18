--!strict
-- Retention systems: research, daily contracts, playtime gifts and Perfect Launch.
-- Server-authoritative: AgencyService merges `actions` into the Act gate (rate-limited there) and calls
-- the hooks below. The client only requests; every reward and check happens here.

local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Contracts = require(ReplicatedStorage.Shared.Contracts)
local Destinations = require(ReplicatedStorage.Shared.Config.Destinations)
local Economy = require(ReplicatedStorage.Shared.Economy)
local Format = require(ReplicatedStorage.Shared.Format)
local Gifts = require(ReplicatedStorage.Shared.Gifts)
local Launch = require(ReplicatedStorage.Shared.Launch)
local Net = require(ReplicatedStorage.Shared.Net)
local Remotes = require(ReplicatedStorage.Shared.Remotes)
local Research = require(ReplicatedStorage.Shared.Research)
local Tuning = require(ReplicatedStorage.Shared.Config.Tuning)
local Telemetry = require(script.Parent.Telemetry)

local Progression = {}

function Progression.today(): number
	return math.floor(os.time() / 86400)
end

local function toast(player: Player, text: string, kind: string)
	Remotes.Toast:FireClient(player, text, kind)
end

local function reward(player: Player, p: any, amount: number, source: string, sourceName: string)
	Economy.earn(p, amount)
	Telemetry.economy(player, true, "Cash", amount, p.cash, sourceName)
	Remotes.Celebrate:FireClient(player, "reward", { amount = amount, source = source })
end

-- ACTIONS ------------------------------------------------------------------------------------------

local TRACKS = { engines = true, efficiency = true, comfort = true }

local actions: { [string]: (Player, any, ...any) -> (boolean, string?) } = {}

function actions.buyResearch(player, p, trackId)
	if not Net.isEnum(trackId, TRACKS) then
		return false, "Unknown track"
	end
	local cost, err = Research.check(p.research, trackId, p.career.stage, p.cash)
	if not cost then
		return false, err
	end
	p.cash -= cost
	p.research[trackId] = (p.research[trackId] or 0) + 1
	Telemetry.economy(player, false, "Cash", cost, p.cash, "Research")
	local track = Research.track(trackId)
	toast(player, `{track.name} upgraded to level {p.research[trackId]}`, "goal")
	return true, nil
end

function actions.claimContract(player, p, index)
	Contracts.ensure(p.contracts, Progression.today(), p.career.stage)
	if not Net.isInt(index, 1, #p.contracts.list) then
		return false, "No such contract"
	end
	local amount, err = Contracts.claim(p.contracts.list, index)
	if not amount then
		return false, err
	end
	reward(player, p, amount, "contract", "ContractReward")
	toast(player, `Contract done, +{Format.money(amount)}`, "money")
	return true, nil
end

function actions.claimGift(player, p)
	local amount, err = Gifts.claim(p.gifts, Progression.today(), p.career.stage)
	if not amount then
		return false, err
	end
	reward(player, p, amount, "gift", "GiftReward")
	toast(player, `Free gift, +{Format.money(amount)}`, "money")
	return true, nil
end

-- Returns true on a hit, false on a miss. Judged on the server's receive time, never a client time.
function actions.perfectLaunch(player, p, missionId)
	if type(missionId) ~= "string" or #missionId > Net.MAX_STRING then
		return false, "Unknown mission"
	end
	local m
	for _, x in p.missions do
		if x.id == missionId then
			m = x
			break
		end
	end
	if not m or m.launch ~= "pending" or m.trips ~= 0 then
		return false, nil
	end
	if Launch.judge(workspace:GetServerTimeNow(), m.departAt) then
		m.launch = "hit"
		Telemetry.custom(player, "PerfectLaunch")
		return true, nil
	end
	m.launch = "miss"
	return false, nil
end

Progression.actions = actions

-- HOOKS --------------------------------------------------------------------------------------------

-- First trip of a Perfect Launch mission pays extra.
function Progression.tripMult(m: any): number
	if m.launch == "hit" and m.trips == 0 then
		return 1 + Tuning.perfectLaunch.bonus
	end
	return 1
end

function Progression.onTrip(player: Player, p: any, m: any, t: Economy.Trip, firstVisit: boolean)
	Contracts.ensure(p.contracts, Progression.today(), p.career.stage)
	local list = p.contracts.list
	Contracts.bump(list, "trips", 1, nil)
	Contracts.bump(list, "tripsTo", 1, m.dest)
	Contracts.bump(list, "passengers", t.filled, nil)
	Contracts.bump(list, "earned", math.max(t.profit, 0), nil)
	if firstVisit then
		toast(player, `New mission patch: {Destinations.byId[m.dest].name}`, "goal")
	end
end

function Progression.onPlan(p: any)
	Contracts.ensure(p.contracts, Progression.today(), p.career.stage)
	Contracts.bump(p.contracts.list, "planned", 1, nil)
end

function Progression.tick(p: any, dt: number)
	Gifts.tick(p.gifts, Progression.today(), dt)
end

-- The part of the client view owned by these systems.
function Progression.view(p: any, now: number)
	local day = Progression.today()
	Contracts.ensure(p.contracts, day, p.career.stage)
	local gifts: any = Gifts.status(p.gifts, day, p.career.stage)
	gifts.at = now
	return {
		research = p.research,
		contracts = { day = p.contracts.day, list = p.contracts.list, resetsAt = (day + 1) * 86400 },
		gifts = gifts,
	}
end

return Progression
