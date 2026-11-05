--!strict
-- Misc tuning. Money numbers live in Economy.luau (economy role).

local Tuning = {}

Tuning.startCoins = 500
Tuning.startFans = 100
Tuning.squad = { max = 24, minAfterSeason = 14, start = 16 }
Tuning.market = {
	size = 6,
	sellRate = 0.7,
	-- base overall of the daily list per division
	levelByDivision = { [5] = 40, [4] = 50, [3] = 60, [2] = 70, [1] = 78 },
}
Tuning.startLevel = 42 -- overall of the starting squad
Tuning.facilityMax = 5
Tuning.training =
	{ maxSlots = 4, gain = 2, firstSeconds = 30, baseSeconds = 60, costBase = 20, costScale = 0.04 }
Tuning.legendsMax = 30
Tuning.offlineMinSeconds = 60

return Tuning
