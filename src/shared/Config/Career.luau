--!strict
-- Career stages and goals. Goal kinds are evaluated in Economy.goalValue.
--   planned: missions planned ever, rockets: rockets owned, earned: lifetime cash
--   served: distinct destinations with an active mission, trips: trips completed
--   rating: agency rating, visited:<dest>: any trip completed there, passengers: total carried

export type Goal = { kind: string, target: number, reward: number, label: string, jump: string }
export type Stage = { name: string, blurb: string, goals: { Goal } }

local stages: { Stage } = {
	{
		name = "Garage Startup",
		blurb = "A dream, a pad, and one tiny rocket.",
		goals = {
			{
				kind = "planned",
				target = 1,
				reward = 20000,
				label = "Launch your first mission",
				jump = "missions",
			},
			{ kind = "rockets", target = 2, reward = 30000, label = "Own 2 rockets", jump = "fleet" },
			{ kind = "earned", target = 100000, reward = 60000, label = "Earn $100K", jump = "missions" },
		},
	},
	{
		name = "Orbital Company",
		blurb = "Satellites and tourists rely on you.",
		goals = {
			{
				kind = "served",
				target = 3,
				reward = 80000,
				label = "Serve 3 destinations",
				jump = "missions",
			},
			{ kind = "trips", target = 50, reward = 60000, label = "Complete 50 trips", jump = "missions" },
			{
				kind = "rating",
				target = 3.5,
				reward = 50000,
				label = "Reach a 3.5 star rating",
				jump = "missions",
			},
		},
	},
	{
		name = "Lunar Agency",
		blurb = "Footprints on the Moon, flags on the map.",
		goals = {
			{
				kind = "visited:moon",
				target = 1,
				reward = 100000,
				label = "Complete a trip to the Moon",
				jump = "missions",
			},
			{ kind = "rockets", target = 5, reward = 120000, label = "Own 5 rockets", jump = "fleet" },
			{ kind = "earned", target = 2000000, reward = 200000, label = "Earn $2M", jump = "missions" },
		},
	},
	{
		name = "Interplanetary",
		blurb = "The red planet is open for business.",
		goals = {
			{
				kind = "visited:mars",
				target = 1,
				reward = 400000,
				label = "Complete a trip to Mars",
				jump = "missions",
			},
			{
				kind = "trips",
				target = 500,
				reward = 300000,
				label = "Complete 500 trips",
				jump = "missions",
			},
			{
				kind = "passengers",
				target = 5000,
				reward = 300000,
				label = "Carry 5,000 passengers",
				jump = "missions",
			},
		},
	},
	{
		name = "Deep Space",
		blurb = "Asteroids, ice moons, and very long flights.",
		goals = {
			{
				kind = "visited:ceres",
				target = 1,
				reward = 800000,
				label = "Complete a trip to Ceres",
				jump = "missions",
			},
			{
				kind = "visited:europa",
				target = 1,
				reward = 1000000,
				label = "Complete a trip to Europa",
				jump = "missions",
			},
			{ kind = "rockets", target = 12, reward = 1000000, label = "Own 12 rockets", jump = "fleet" },
		},
	},
	{
		name = "Galactic Pioneer",
		blurb = "Legends are made at Saturn.",
		goals = {
			{
				kind = "visited:titan",
				target = 1,
				reward = 5000000,
				label = "Complete a trip to Titan",
				jump = "missions",
			},
			{
				kind = "earned",
				target = 100000000,
				reward = 10000000,
				label = "Earn $100M",
				jump = "missions",
			},
		},
	},
}

return { stages = stages }
