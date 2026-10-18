--!strict
-- Payout and rank tuning (docs/economy-and-monetization.md §2). Hypotheses until playtests.

return {
	payout = {
		crewBase = 40,
		perCrewCorrect = 5,
		perCorrect = 4,
		perCrate = 3,
		perNet = 10,
		perFriend = 0.10, -- Crew Bonus
		friendCap = 3,
		failedMultiplier = 0.5,
		maxCoins = 600, -- clamp; a breach is logged as an anomaly
	},
	rank = { base = 150, growth = 1.15, max = 30 },
	-- Title shown for ranks from `from` upward.
	titles = {
		{ from = 1, title = "Deckhand" },
		{ from = 4, title = "Lamplighter" },
		{ from = 8, title = "Signal Keeper" },
		{ from = 13, title = "Harbor Pilot" },
		{ from = 20, title = "Harbormaster" },
		{ from = 30, title = "Keeper of the Bell" },
	},
	supplies = { perCrate = 1, leftBehindShare = 0.5 },
}
