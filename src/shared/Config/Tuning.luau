--!strict
-- Global economy tuning (docs/game-design-document.md Economy section).

return {
	startCash = 60000,
	baseTripSeconds = 30,
	minTripSeconds = 30,
	maxTripSeconds = 180,
	turnaroundSeconds = 4,
	offlineCapSeconds = 8 * 3600,
	fares = {
		{
			id = "budget",
			name = "Budget",
			fareMult = 0.8,
			demandMult = 1.2,
			blurb = "Fills every seat. Lower profit per seat.",
		},
		{
			id = "standard",
			name = "Standard",
			fareMult = 1.0,
			demandMult = 1.0,
			blurb = "Balanced. A safe choice.",
		},
		{
			id = "premium",
			name = "Premium",
			fareMult = 1.25,
			demandMult = 0.8,
			blurb = "Higher fares, fewer takers.",
		},
	},
	services = {
		{ id = "basic", name = "Basic", costShare = 0, demandMult = 1.0, rating = 2.5, blurb = "No frills." },
		{
			id = "comfort",
			name = "Comfort",
			costShare = 0.03,
			demandMult = 1.05,
			rating = 4.0,
			blurb = "Happier passengers.",
		},
		{
			id = "luxury",
			name = "Luxury",
			costShare = 0.08,
			demandMult = 1.12,
			rating = 5.0,
			blurb = "Space-hotel treatment. Best rating.",
		},
	},
	stageRewardMult = { 1, 2, 4, 8, 16, 32 },
	perfectLaunch = { opensAfter = 2.6, windowSeconds = 0.5, graceSeconds = 0.3, bonus = 0.25 },
	contracts = {
		count = 3,
		templates = {
			{ kind = "trips", targets = { 5, 10, 20 }, reward = 6000 },
			{ kind = "tripsTo", targets = { 3, 6, 10 }, reward = 7000 },
			{ kind = "passengers", targets = { 60, 150, 300 }, reward = 6000, scales = true },
			{ kind = "earned", targets = { 20000, 60000, 150000 }, reward = 8000, scales = true },
			{ kind = "planned", targets = { 1, 2, 3 }, reward = 5000 },
		},
	},
	research = {
		unlockStage = 2,
		maxLevel = 5,
		tracks = {
			{
				id = "engines",
				name = "Engines",
				base = 80000,
				growth = 2.2,
				step = 0.06,
				blurb = "Faster trips. +6% speed per level.",
			},
			{
				id = "efficiency",
				name = "Efficiency",
				base = 60000,
				growth = 2.2,
				step = 0.08,
				blurb = "Cheaper fuel. 8% less per level.",
			},
			{
				id = "comfort",
				name = "Comfort",
				base = 70000,
				growth = 2.2,
				step = 0.04,
				blurb = "More takers. +4% demand per level.",
			},
		},
	},
	gifts = {
		{ minutes = 5, cash = 4000 },
		{ minutes = 10, cash = 8000 },
		{ minutes = 20, cash = 15000 },
		{ minutes = 40, cash = 30000 },
	},
	daily = { 10000, 15000, 20000, 30000, 40000, 60000, 100000 },
	agencyColors = {
		Color3.fromHex("FF6B2C"),
		Color3.fromHex("2F6BFF"),
		Color3.fromHex("19B46B"),
		Color3.fromHex("8B5CF6"),
		Color3.fromHex("E5484D"),
		Color3.fromHex("F5A524"),
		Color3.fromHex("0EA5B7"),
		Color3.fromHex("EC4899"),
	},
	-- Monetization (ids are 0 until the place is published and products exist).
	passes = {
		doubleCash = {
			id = 0,
			name = "2x Cash",
			price = 199,
			blurb = "Earn double cash from every profitable trip.",
		},
		fastLaunch = {
			id = 0,
			name = "+50% Launch Speed",
			price = 149,
			blurb = "Trips finish 33% sooner, forever.",
		},
		starter = {
			id = 0,
			name = "Starter Pack",
			price = 79,
			blurb = "$150K cash and the exclusive Aurora livery.",
		},
	},
	products = {
		serverBoost = {
			id = 0,
			name = "Server Boost",
			price = 49,
			minutes = 15,
			blurb = "2x cash for everyone here for 15 minutes.",
		},
	},
}
