--!strict
-- Rocket catalog. Original bird names (no real-world trademarks). Tuning lives here.
-- capacity = passengers/units per trip, range = max destination distance, fuel = cost per distance unit

export type Rocket = {
	id: string,
	name: string,
	class: string,
	capacity: number,
	range: number,
	speed: number,
	fuel: number,
	price: number,
	stage: number,
	scale: number, -- model size in the hangar view
	boosters: number, -- side boosters on the model
	blurb: string,
}

local list: { Rocket } = {
	{
		id = "sparrow",
		name = "Sparrow",
		class = "Light",
		capacity = 6,
		range = 1.5,
		speed = 1.0,
		fuel = 1200,
		price = 60000,
		stage = 1,
		scale = 0.8,
		boosters = 0,
		blurb = "Tiny and cheap. Perfect for low orbit hops.",
	},
	{
		id = "kestrel",
		name = "Kestrel",
		class = "Light",
		capacity = 10,
		range = 2,
		speed = 1.1,
		fuel = 1800,
		price = 100000,
		stage = 1,
		scale = 0.9,
		boosters = 0,
		blurb = "A dependable workhorse for near-Earth runs.",
	},
	{
		id = "heron",
		name = "Heron",
		class = "Medium",
		capacity = 18,
		range = 3.5,
		speed = 1.2,
		fuel = 3600,
		price = 260000,
		stage = 2,
		scale = 1.0,
		boosters = 2,
		blurb = "Reaches the Moon with room to spare.",
	},
	{
		id = "osprey",
		name = "Osprey",
		class = "Medium",
		capacity = 24,
		range = 5,
		speed = 1.3,
		fuel = 6000,
		price = 480000,
		stage = 3,
		scale = 1.1,
		boosters = 2,
		blurb = "Fast and roomy. Built for deep cislunar trips.",
	},
	{
		id = "albatross",
		name = "Albatross",
		class = "Heavy",
		capacity = 40,
		range = 8,
		speed = 1.4,
		fuel = 11000,
		price = 950000,
		stage = 4,
		scale = 1.25,
		boosters = 2,
		blurb = "Your ticket to Mars and the asteroid belt.",
	},
	{
		id = "condor",
		name = "Condor",
		class = "Heavy",
		capacity = 60,
		range = 11,
		speed = 1.6,
		fuel = 20000,
		price = 1900000,
		stage = 5,
		scale = 1.4,
		boosters = 4,
		blurb = "Outer-planet hauler with huge capacity.",
	},
	{
		id = "phoenix",
		name = "Phoenix",
		class = "Super-heavy",
		capacity = 90,
		range = 15,
		speed = 2.0,
		fuel = 38000,
		price = 4500000,
		stage = 6,
		scale = 1.6,
		boosters = 4,
		blurb = "The flagship. Nothing in the system is out of reach.",
	},
}

local byId: { [string]: Rocket } = {}
for _, r in list do
	byId[r.id] = r
end

return {
	list = list,
	byId = byId,
	classes = { "Light", "Medium", "Heavy", "Super-heavy" },
	starter = "sparrow",
}
