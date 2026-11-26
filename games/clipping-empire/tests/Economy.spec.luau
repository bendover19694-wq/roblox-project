local Economy = shared("Economy")
local Config = shared("Config")

test("default profile is empty and in zone 1", function()
	local p = Economy.default()
	assert(p.cash == 0 and p.clips == 0 and p.followers == 0, "empty")
	assert(Economy.unlockedZone(p.followers) == 1, "zone 1")
	assert(Economy.capacity(p) == Config.STORAGE_BASE, "base capacity")
end)

test("migrate repairs corrupt saves", function()
	local p = Economy.migrate({
		cash = 0 / 0,
		clips = 1e12,
		levels = { tapPower = 999, viral = -3 },
		clout = math.huge,
	})
	assert(p.cash == 0, "NaN cash")
	assert(p.levels.tapPower == Config.UPGRADES.tapPower.max, "level clamped")
	assert(p.levels.viral == 0, "negative level")
	assert(p.clout == 0, "inf clout")
	assert(p.clips == Economy.capacity(p), "clips clamped to capacity")
	assert(Economy.migrate(nil).version == Economy.VERSION, "nil save")
	assert(Economy.migrate("junk").cash == 0, "wrong type")
end)

test("addClips stops at capacity", function()
	local p = Economy.default()
	local cap = Economy.capacity(p)
	assert(Economy.addClips(p, cap - 5) == cap - 5, "partial")
	assert(Economy.addClips(p, 100) == 5, "fills to cap only")
	assert(Economy.addClips(p, 1) == 0, "full")
	assert(Economy.addClips(p, -10) == 0, "negative ignored")
	assert(p.clips == cap, "at cap")
end)

test("post pays clips times value, viral multiplies", function()
	local p = Economy.default()
	Economy.addClips(p, 10)
	local cash, followers, viral = Economy.post(p, 1, false, 0.99)
	assert(not viral, "no viral on high roll")
	assert(cash == 10, `10 clips at value 1, got {cash}`)
	assert(followers == 2, `followers {followers}`)
	assert(p.clips == 0 and p.cash == 10, "clips spent")

	local q = Economy.default()
	Economy.addClips(q, 10)
	local vcash, _, vflag = Economy.post(q, 1, false, 0)
	assert(vflag and vcash == 10 * Config.VIRAL_MULT, "viral pays 5x")
	assert(select(1, Economy.post(q, 1, false, 0)) == 0, "empty post pays nothing")
end)

test("zone and hype multiply clip value", function()
	local p = Economy.default()
	assert(Economy.clipValue(p, 2, false) == Config.ZONES[2].mult, "zone 2 doubles")
	assert(Economy.clipValue(p, 1, true) == Config.HYPE_MULT, "hype triples")
end)

test("buy spends cash, rejects short cash and max", function()
	local p = Economy.default()
	local ok, why = Economy.buy(p, "tapPower")
	assert(not ok and why == "Not enough cash", "broke")
	p.cash = Economy.cost("tapPower", 0)
	assert(Economy.buy(p, "tapPower"), "buys")
	assert(p.cash == 0 and p.levels.tapPower == 1, "spent")
	assert(Economy.tapPower(p) == 2, "tap power up")
	p.cash = 1e9
	assert(Economy.buy(p, "autoPost"), "auto post once")
	assert(not Economy.buy(p, "autoPost"), "auto post maxed")
	assert(not Economy.buy(p, "nope"), "unknown")
end)

test("costs grow every level", function()
	for id, up in Config.UPGRADES do
		if up.max > 1 then
			assert(Economy.cost(id, 5) > Economy.cost(id, 4), id)
		end
	end
end)

test("rebirth resets progress, keeps followers, adds clout", function()
	local p = Economy.default()
	p.followers = 5000
	p.levels.editing = 10
	p.cash = Economy.rebirthCost(p) - 1
	assert(not Economy.rebirth(p), "too poor")
	p.cash += 1
	assert(Economy.rebirth(p), "rebirths")
	assert(p.cash == 0 and p.levels.editing == 0 and p.clout == 1 and p.followers == 5000, "reset")
	assert(Economy.rebirthCost(p) == Config.REBIRTH_BASE * Config.REBIRTH_GROWTH, "next cost grows")
	assert(Economy.clipValue(p, 1, false) > Economy.followerBonus(5000), "clout boosts value")
	assert(Economy.cloutMult(2) == Config.CLOUT_BASE ^ 2, "clout multiplier is geometric")
	-- Vault: the multiplier grows a bit slower than the cost, so each rebirth takes gently longer.
	assert(Config.CLOUT_BASE < Config.REBIRTH_GROWTH, "multiplier slower than cost")
end)

test("zoneAt maps street X to zones", function()
	assert(Economy.zoneAt(10, 0) == 1, "zone 1")
	assert(Economy.zoneAt(Config.ZONE_WIDTH + 1, 0) == 2, "zone 2")
	assert(Economy.zoneAt(-5, 0) == nil, "behind spawn")
	assert(Economy.zoneAt(10, Config.ZONE_DEPTH) == nil, "off street")
	assert(Economy.zoneAt(Config.ZONE_WIDTH * #Config.ZONES + 1, 0) == nil, "past the end")
	assert(Economy.unlockedZone(Config.ZONES[3].followers) == 3, "unlock by followers")
end)

test("hype window follows the clock truthfully", function()
	local on, left = Economy.hype(0)
	assert(on and left == Config.HYPE_LENGTH, "starts on")
	local off, wait = Economy.hype(Config.HYPE_LENGTH)
	assert(not off and wait == Config.HYPE_PERIOD - Config.HYPE_LENGTH, "then off")
	assert(Economy.hype(Config.HYPE_PERIOD + 1), "repeats")
end)

test("first reward is reachable in under a minute of tapping", function()
	-- 5 taps per second for 12 s fills the base drive; one post must afford the first upgrade.
	local p = Economy.default()
	Economy.addClips(p, 5 * 12 * Economy.tapPower(p))
	Economy.post(p, 1, false, 0.99)
	assert(p.cash >= Economy.cost("tapPower", 0), `cash {p.cash}`)
end)

test("tiny posts earn no extra followers, fractions carry over", function()
	local p = Economy.default()
	for _ = 1, 10 do
		Economy.addClips(p, 1)
		Economy.post(p, 1, false, 0.99)
	end
	local q = Economy.default()
	Economy.addClips(q, 10)
	Economy.post(q, 1, false, 0.99)
	assert(math.abs(p.followers - q.followers) < 1e-9, `{p.followers} vs {q.followers}`)
end)

test("rebirth keeps the one-off Auto Poster", function()
	local p = Economy.default()
	p.levels.autoPost = 1
	p.levels.tapPower = 5
	p.cash = Economy.rebirthCost(p)
	assert(Economy.rebirth(p), "rebirths")
	assert(p.levels.autoPost == 1 and p.levels.tapPower == 0, "auto poster kept, rest reset")
end)

test("indexSeen survives a save and defaults to false", function()
	assert(Economy.default().indexSeen == false, "default")
	assert(Economy.migrate({ indexSeen = true }).indexSeen == true, "kept")
	assert(Economy.migrate({ indexSeen = "yes" }).indexSeen == false, "only true counts")
end)
