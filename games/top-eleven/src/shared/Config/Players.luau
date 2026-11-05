--!strict
-- Player rating rules.

local Players = {}

-- Position-weighted overall. Each row sums to 1.
Players.weights = {
	GK = { keeping = 0.9, passing = 0.1 },
	DF = { defending = 0.55, pace = 0.2, passing = 0.2, shooting = 0.05 },
	MF = { passing = 0.5, defending = 0.15, shooting = 0.15, pace = 0.2 },
	FW = { shooting = 0.55, pace = 0.3, passing = 0.15 },
}

-- Potential bands per rarity (inclusive).
Players.potential = {
	common = { 40, 65 },
	rare = { 60, 78 },
	epic = { 75, 90 },
	legendary = { 88, 99 },
}

Players.outOfPositionMult = 0.75
Players.declineAge = 31
Players.declinePerSeason = 2
Players.retireAge = 36

return Players
