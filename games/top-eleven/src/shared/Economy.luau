--!strict
-- Rewards, prices and income. All numbers come from Config/Economy (economy role). Pure.

local Cfg = require(script.Parent.Config.Economy)
local Player = require(script.Parent.Player)
local Tuning = require(script.Parent.Config.Tuning)

local Economy = {}

type Result = "win" | "draw" | "loss"
export type FacilityId = "stadium" | "training" | "academy"

function Economy.matchReward(result: Result, goals: number, division: number): number
	return math.floor((Cfg.reward[result] + goals * Cfg.reward.perGoal) * Cfg.divisionMult[division])
end

function Economy.gate(stadiumLevel: number, fans: number): number
	return math.floor(
		Cfg.gate.base * stadiumLevel ^ Cfg.gate.levelExp + fans * Cfg.gate.perFan * stadiumLevel
	)
end

function Economy.offline(stadiumLevel: number, fans: number, seconds: number): number
	if seconds ~= seconds or seconds <= 0 then
		return 0
	end
	local hours = math.min(seconds, Cfg.offline.capHours * 3600) / 3600
	return math.floor(hours * Economy.gate(stadiumLevel, fans) * Cfg.offline.gatePerHour)
end

function Economy.fansDelta(result: Result, division: number): number
	return math.floor(Cfg.fans[result] * (1 + (Tuning.facilityMax - division) * Cfg.fans.divisionBonus))
end

function Economy.fansPromotion(): number
	return Cfg.fans.promotion
end

function Economy.seasonPrize(division: number, place: number): number
	return math.floor(Cfg.prizeBase[division] * Cfg.placeMult[place])
end

function Economy.playerValue(p: Player.PlayerT): number
	local v = Cfg.value
	local ov = Player.overall(p)
	local value = v.base * v.growth ^ ov
	local room = math.max(0, p.potential - ov) / 100
	value *= 1 + room * (if p.age <= v.youthAge then v.youthPotential else v.olderPotential)
	if p.age > v.agingStart then
		value *= math.max(0.3, 1 - v.agingPerYear * (p.age - v.agingStart))
	end
	return math.max(v.min, math.floor(value / 10 + 0.5) * 10)
end

function Economy.facilityCost(facility: FacilityId, nextLevel: number): number
	local f = Cfg.facility[facility]
	return math.floor(f.base * f.growth ^ (nextLevel - 2))
end

return Economy
