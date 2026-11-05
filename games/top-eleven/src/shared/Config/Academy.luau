--!strict
-- Scouting. Percentages shown to the player as they are; each row sums to 100.

local Academy = {}

Academy.rechargeSeconds = 14400
Academy.maxCharges = 3
Academy.maxProspects = 5
Academy.odds = {
	[1] = { common = 70, rare = 24, epic = 5, legendary = 1 },
	[2] = { common = 64, rare = 28, epic = 7, legendary = 1 },
	[3] = { common = 58, rare = 31, epic = 9, legendary = 2 },
	[4] = { common = 52, rare = 34, epic = 12, legendary = 2 },
	[5] = { common = 46, rare = 36, epic = 15, legendary = 3 },
}
Academy.potentialBonus = { [1] = 0, [2] = 2, [3] = 4, [4] = 6, [5] = 8 }
Academy.positionWeights = { GK = 1, DF = 3, MF = 3, FW = 3 }

return Academy
