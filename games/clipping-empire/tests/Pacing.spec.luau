-- Simulates a player who taps 5 times a second, posts when the drive is full, buys the cheapest
-- upgrade while it costs under SAVE_SHARE of the next rebirth, and goes viral as soon as it can.
-- Guards the pacing targets in docs/game-overview.md (section 9). Never viral, so numbers are a floor.
local Economy = shared("Economy")
local Config = shared("Config")

local SAVE_SHARE = 0.2 -- the bot stops buying upgrades that cost more than this share of the rebirth

local function simulate(seconds: number)
	local p = Economy.default()
	local marks = {}
	local rebirths: { number } = {}
	local seed = 12345
	local function uniform(): number -- seeded, so rarity rolls repeat run to run
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
		if Economy.autoRate(p) >= 1 then
			Economy.take(p, Economy.autoRate(p), Economy.rollTier(luck, uniform()))
		end
		if p.clips >= Economy.capacity(p) then
			Economy.post(p, zone, false, 0.5)
		end
		local budget = Economy.rebirthCost(p) * SAVE_SHARE
		while true do
			local best, bestCost = nil, math.huge
			for id in Config.UPGRADES do
				local c = Economy.nextCost(p, id)
				if c and c < bestCost then
					best, bestCost = id, c
				end
			end
			if not best or p.cash < bestCost or bestCost > budget then
				break
			end
			Economy.buy(p, best)
		end
		if Economy.rebirth(p) then
			table.insert(rebirths, t)
		end
	end
	return marks, rebirths
end

local marks, rebirths = simulate(3 * 3600)
local gaps = {}
for i, t in rebirths do
	table.insert(gaps, string.format("%.1f", (t - (rebirths[i - 1] or 0)) / 60))
end
print(
	`pacing: zone2 {marks[2] or "-"}s  zone3 {marks[3] or "-"}s  zone4 {marks[4] or "-"}s  zone5 {marks[5] or "-"}s`
)
print(`pacing: rebirth gaps (min) {table.concat(gaps, ", ")}`)

test("zone 2 opens within the first two minutes", function()
	assert(marks[2] and marks[2] <= 120, `zone 2 at {marks[2]}`)
end)

test("zone 3 opens within 15 minutes", function()
	assert(marks[3] and marks[3] <= 900, `zone 3 at {marks[3]}`)
end)

test("first rebirth lands between 10 and 30 minutes", function()
	assert(rebirths[1] and rebirths[1] >= 600 and rebirths[1] <= 1800, `first rebirth at {rebirths[1]}`)
end)

test("each rebirth takes gently longer, never hours longer", function()
	-- Vault (Progression and Pacing Design, section 5): T(k) rises slowly; no step more than 2.5x the last.
	assert(#rebirths >= 3, `only {#rebirths} rebirths in 3 hours`)
	for i = 2, #rebirths do
		local gap, prev = rebirths[i] - rebirths[i - 1], rebirths[i - 1] - (rebirths[i - 2] or 0)
		assert(gap <= prev * 2.5, `rebirth {i} took {gap}s after a {prev}s one`)
	end
end)
