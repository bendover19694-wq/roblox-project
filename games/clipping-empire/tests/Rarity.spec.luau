local Economy = shared("Economy")
local Config = shared("Config")
local N = #Config.RARITIES

local function sum(t: { number }): number
	local s = 0
	for _, v in t do
		s += v
	end
	return s
end

test("odds sum to 1 at any luck and match base odds at luck 1", function()
	for _, luck in { 1, 1.7, 5, 40, 10000 } do
		local odds = Economy.odds(luck)
		assert(math.abs(sum(odds) - 1) < 1e-9, `sum at luck {luck}: {sum(odds)}`)
		for i = 1, N do
			assert(odds[i] >= 0, `negative odds tier {i}`)
		end
	end
	local base = Economy.odds(1)
	for i = 2, N do
		assert(
			math.abs(base[i] - 1 / Config.RARITIES[i].oneIn) < 1e-12,
			`tier {i} is exactly 1 in N at luck 1`
		)
	end
end)

test("luck raises Rare and up, and never wipes out a tier", function()
	local a, b = Economy.odds(1), Economy.odds(2)
	assert(b[1] < a[1] and b[2] < a[2], "Common and Uncommon shrink")
	for i = Config.LUCK_FROM_TIER, N do
		assert(b[i] > a[i], `tier {i} rises`)
	end
	local top = Economy.odds(Config.LUCK_CAP)
	for i = 1, N do
		assert(top[i] > 0, `tier {i} still possible at the luck cap`)
	end
	assert(top[1] > 0.25, `Common stays common at the cap: {top[1]}`)
end)

test("stacked luck is capped", function()
	local p = Economy.default()
	p.levels.luck = Config.UPGRADES.luck.max
	p.clout = 1000
	assert(Economy.luck(p, true) == Config.LUCK_CAP, "capped")
end)

test("rarity waits: median and p90 minutes at a steady 7 takes a second", function()
	-- Vault (Rarity Ladders and Drop Pacing Math): pace on the median and p90, not the mean.
	local perMin = 7 * 60
	local function minutes(p: number, q: number): number -- takes until P(found) = q, in minutes
		return math.log(1 - q) / math.log(1 - p) / perMin
	end
	local odds = Economy.odds(1)
	local line = {}
	for i = 2, N do
		table.insert(
			line,
			`{Config.RARITIES[i].name} {string.format("%.1f", minutes(odds[i], 0.5))}/{string.format(
				"%.1f",
				minutes(odds[i], 0.9)
			)}`
		)
	end
	print("rarity waits (median/p90 min, luck 1): " .. table.concat(line, "  "))
	assert(minutes(odds[N - 1], 0.5) <= 10, "a first Legendary in the first session (median)")
	assert(minutes(odds[N], 0.5) >= 30, "Mythic is a long goal, not a first-session drop")
	assert(minutes(odds[N], 0.5) <= 180, "but its median wait stays within a few sessions")
	local lucky = Economy.odds(10) -- a mid-game player: some Lens, a few Clout, a Trailer Drop
	assert(minutes(lucky[N], 0.9) <= 60, "with mid-game luck, p90 Mythic is within an hour")
end)

test("rollTier maps the roll rarest first", function()
	assert(Economy.rollTier(1, 0) == N, "u = 0 is the rarest")
	assert(Economy.rollTier(1, 0.999999) == 1, "u near 1 is Common")
	-- Count tiers over an even grid of rolls: shares match the odds.
	local counts = table.create(N, 0)
	local steps = 200000
	for k = 0, steps - 1 do
		local t = Economy.rollTier(1.5, (k + 0.5) / steps)
		counts[t] += 1
	end
	local odds = Economy.odds(1.5)
	for i = 1, N do
		assert(math.abs(counts[i] / steps - odds[i]) < 1e-4, `tier {i} share`)
	end
end)

test("luck combines Lucky Lens, Clout and the Trailer Drop", function()
	local p = Economy.default()
	assert(Economy.luck(p, false) == 1, "base luck 1")
	p.levels.luck = 10
	p.clout = 5
	local expect = (1 + 10 * Config.LUCK_PER_LEVEL) * (1 + 5 * Config.CLOUT_LUCK)
	assert(math.abs(Economy.luck(p, false) - expect) < 1e-9, "lens times clout")
	assert(math.abs(Economy.luck(p, true) - expect * Config.HYPE_LUCK) < 1e-9, "drop doubles")
end)

test("take stores clips by tier, records finds, and respects capacity", function()
	local p = Economy.default()
	local added, isNew = Economy.take(p, 5, 3)
	assert(added == 5 and isNew, "first Rare is new")
	local _, again = Economy.take(p, 5, 3)
	assert(not again, "second Rare is not new")
	assert(p.drive[3] == 10 and p.clips == 10 and p.found[3] == 2 and p.best == 3, "bookkeeping")
	Economy.take(p, 1000, 1)
	assert(p.clips == Economy.capacity(p) and sum(p.drive) == p.clips, "drive sums to clips at cap")
	local none, _ = Economy.take(p, 5, N)
	assert(none == 0 and p.found[N] == 0 and p.best == 3, "a full drive records nothing")
end)

test("post pays each clip by its tier and empties the drive", function()
	local p = Economy.default()
	Economy.take(p, 4, 1)
	Economy.take(p, 2, 4)
	local expected = 4 * Config.RARITIES[1].pays + 2 * Config.RARITIES[4].pays
	local cash, followers = Economy.post(p, 1, false, 0.99)
	assert(cash == math.floor(expected), `cash {cash} vs {expected}`)
	assert(math.abs(followers - expected * Config.FOLLOWERS_PER_CLIP) < 1e-9, "followers weighted too")
	assert(p.clips == 0 and sum(p.drive) == 0, "drive empty")
end)

test("rebirth empties the drive but keeps the collection", function()
	local p = Economy.default()
	Economy.take(p, 3, 5)
	p.cash = Economy.rebirthCost(p)
	assert(Economy.rebirth(p), "rebirth ok")
	assert(sum(p.drive) == 0 and p.found[5] == 1 and p.best == 5, "found kept, drive reset")
end)

test("migrate turns v1 clips into Common and repairs a bad drive", function()
	local v1 = Economy.migrate({ version = 1, clips = 12, levels = {} })
	assert(v1.drive[1] == 12 and sum(v1.drive) == 12, "v1 clips are Common")
	local bad = Economy.migrate({ clips = 5, drive = { 1, 1, 0 / 0, -4 }, found = { 2, "x" }, best = 99 })
	assert(sum(bad.drive) == bad.clips, "drive sums to clips")
	assert(bad.found[1] == 2 and bad.found[2] == 0, "found repaired")
	assert(bad.best == N, "best clamped")
	local ok = Economy.migrate({ clips = 6, drive = { 1, 2, 3 } })
	assert(ok.drive[3] == 3, "a valid drive is kept")
end)
