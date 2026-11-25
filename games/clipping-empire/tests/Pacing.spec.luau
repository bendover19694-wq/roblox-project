-- Simulates a player who taps 5 times a second, posts when the drive is full and always buys the
-- cheapest upgrade. Guards the pacing targets in docs/design.md.
local Economy = shared("Economy")
local Config = shared("Config")

local function simulate(seconds: number)
	local p = Economy.default()
	local marks = {}
	local rng = 0.5 -- never viral, so the numbers are a floor
	local seed = 12345
	local function uniform(): number -- seeded LCG, so rarity rolls repeat run to run
		seed = (seed * 16807) % 2147483647 -- Park-Miller: stays exact in a double
		return seed / 2147483647
	end
	for t = 1, seconds do
		local zone = Economy.unlockedZone(p.followers)
		if not marks[zone] then
			marks[zone] = t
		end
		local luck = Economy.luck(p, false)
		for _ = 1, 5 do
			Economy.take(p, Economy.tapPower(p), Economy.rollTier(luck, uniform()))
		end
		Economy.take(p, Economy.autoRate(p), Economy.rollTier(luck, uniform()))
		if p.clips >= Economy.capacity(p) then
			Economy.post(p, zone, false, rng)
		end
		while true do
			local best, bestCost = nil, math.huge
			for id in Config.UPGRADES do
				local c = Economy.nextCost(p, id)
				if c and c < bestCost then
					best, bestCost = id, c
				end
			end
			if not best or p.cash < bestCost then
				break
			end
			Economy.buy(p, best)
		end
		if not marks.rebirth and p.cash >= Economy.rebirthCost(p) then
			marks.rebirth = t
		end
	end
	return marks
end

local marks = simulate(3600)
print(
	`pacing: zone2 {marks[2] or "-"}s  zone3 {marks[3] or "-"}s  zone4 {marks[4] or "-"}s  rebirth-ready {marks.rebirth or "-"}s`
)

test("zone 2 opens within 10 minutes", function()
	assert(marks[2] and marks[2] <= 600, `zone 2 at {marks[2]}`)
end)

test("zone 3 opens within 30 minutes", function()
	assert(marks[3] and marks[3] <= 1800, `zone 3 at {marks[3]}`)
end)

test("first rebirth is reachable within an hour", function()
	assert(marks.rebirth and marks.rebirth <= 3600, `rebirth at {marks.rebirth}`)
end)
