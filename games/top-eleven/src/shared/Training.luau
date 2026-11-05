--!strict
-- Training slots: checks, costs, gains. Pure.

local Player = require(script.Parent.Player)
local Tuning = require(script.Parent.Config.Tuning)

local Training = {}

local STAT_SET: { [string]: boolean } =
	{ pace = true, shooting = true, passing = true, defending = true, keeping = true }

function Training.slots(level: number): number
	return math.min(level, Tuning.training.maxSlots)
end

-- Coins and seconds for one training of a rating currently at `stat`, at Training Ground `level`.
function Training.cost(level: number, stat: number): (number, number)
	local t = Tuning.training
	local coins = math.floor(t.costBase + stat * stat * t.costScale)
	local seconds = math.floor(t.baseSeconds * (stat / 40) ^ 1.5 / (1 + 0.15 * (level - 1)))
	return coins, math.max(10, seconds)
end

function Training.check(p: any, slot: number, playerId: string, stat: Player.Stat): (boolean, string?)
	if type(stat) ~= "string" or not STAT_SET[stat] then
		return false, "Pick a rating"
	end
	if slot < 1 or slot > Training.slots(p.facilities.training) then
		return false, "No such slot"
	end
	if p.training.slots[slot] then
		return false, "Slot is busy"
	end
	local pl = p.players[playerId]
	if not pl then
		return false, "Pick a player"
	end
	for _, s in p.training.slots do
		if s and s.playerId == playerId then
			return false, "Already training"
		end
	end
	if pl.r[stat] >= pl.potential then
		return false, "At potential"
	end
	local coins = Training.cost(p.facilities.training, pl.r[stat])
	if p.coins < coins then
		return false, "Not enough coins"
	end
	return true, nil
end

function Training.apply(player: Player.PlayerT, stat: Player.Stat, gain: number)
	local r: any = player.r
	r[stat] = math.min(player.potential, 99, r[stat] + gain)
end

return Training
