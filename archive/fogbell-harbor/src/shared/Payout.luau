--!strict
-- Night payout and rank math. Pure; see tests/Payout.spec.luau.

local Economy = require(script.Parent.Config.Economy)

local Payout = {}

export type Stats = {
	crewCorrect: number,
	correct: number,
	crates: number,
	nets: number,
	failed: boolean,
	friends: number,
	firstNightToday: boolean,
}

-- Returns coins, xp, clamped (true if the cap was hit — log it as an anomaly).
function Payout.night(s: Stats): (number, number, boolean)
	local p = Economy.payout
	local raw = p.crewBase
		+ p.perCrewCorrect * s.crewCorrect
		+ p.perCorrect * s.correct
		+ p.perCrate * s.crates
		+ p.perNet * s.nets
	local mult = (if s.failed then p.failedMultiplier else 1)
		* (1 + math.min(s.friends, p.friendCap) * p.perFriend)
	local coins = math.floor(raw * mult)
	local clamped = coins > p.maxCoins
	coins = math.min(coins, p.maxCoins)
	local xp = coins * (if s.firstNightToday then 2 else 1)
	return coins, xp, clamped
end

function Payout.xpToNext(rank: number): number
	return math.floor(Economy.rank.base * Economy.rank.growth ^ (rank - 1))
end

-- Rank for a lifetime XP total, plus progress (0..1) toward the next rank.
function Payout.rankFor(totalXp: number): (number, number)
	local rank, left = 1, totalXp
	while rank < Economy.rank.max and left >= Payout.xpToNext(rank) do
		left -= Payout.xpToNext(rank)
		rank += 1
	end
	if rank == Economy.rank.max then
		return rank, 1
	end
	return rank, left / Payout.xpToNext(rank)
end

function Payout.titleFor(rank: number): string
	local title = Economy.titles[1].title
	for _, t in Economy.titles do
		if rank >= t.from then
			title = t.title
		end
	end
	return title
end

return Payout
