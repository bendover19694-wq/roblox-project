--!strict
-- League shape and AI strength.

local League = {}

League.divisions = 5
League.clubsPerDivision = 6
League.promote = 2
League.relegate = 1

-- Average AI club strength (overall) per division; grows slowly with the season.
League.strength = { [5] = 38, [4] = 48, [3] = 58, [2] = 68, [1] = 78 }
League.seasonGrowth = 0.5
League.seasonGrowthCap = 20
League.spread = { -2, 1, 4, 7 } -- offsets for the four AI clubs that are not the first opponent
League.firstMatchGap = 8 -- the first opponent is this far below the division average

League.quickBase = 1.3 -- quick-sim goals per side at equal strength
League.quickHome = 1.08
League.quickExp = 1.6

return League
