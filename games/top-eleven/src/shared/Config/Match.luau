--!strict
-- Match sim tuning.

local Match = {}

-- Slot positions in slot order (slot 1 is always the keeper).
Match.formations = {
	["4-4-2"] = { "GK", "DF", "DF", "DF", "DF", "MF", "MF", "MF", "MF", "FW", "FW" },
	["4-3-3"] = { "GK", "DF", "DF", "DF", "DF", "MF", "MF", "MF", "FW", "FW", "FW" },
	["3-5-2"] = { "GK", "DF", "DF", "DF", "MF", "MF", "MF", "MF", "MF", "FW", "FW" },
	["5-3-2"] = { "GK", "DF", "DF", "DF", "DF", "DF", "MF", "MF", "MF", "FW", "FW" },
	["4-5-1"] = { "GK", "DF", "DF", "DF", "DF", "MF", "MF", "MF", "MF", "MF", "FW" },
}

Match.segmentSeconds = 13
Match.segments = { { 1, 30 }, { 31, 60 }, { 61, 90 } } -- minute ranges

-- attack/defence scale a side's own strengths; chances scales the chance count of BOTH sides.
Match.tactics = {
	attack = { attack = 1.12, defence = 0.9, chances = 1.15 },
	balanced = { attack = 1, defence = 1, chances = 1 },
	defend = { attack = 0.9, defence = 1.12, chances = 0.85 },
	press = { attack = 1, defence = 1, chances = 1.25 },
}

Match.trials = 4 -- chance rolls per side per segment
Match.chanceBase = 0.45
Match.midExp = 0.8
Match.goalBase = 0.26
Match.goalExp = 1.0
Match.keeperExp = 0.5
Match.saveShare = 0.55 -- of non-goal chances, the keeper stops this share (keeper rating shifts it)
Match.bigChanceShare = 0.4 -- of misses, shown as a near miss
Match.homeBoost = 1.03

return Match
