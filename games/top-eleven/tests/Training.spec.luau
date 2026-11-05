local Training = shared("Training")
local Player = shared("Player")
local Rng = shared("Rng")

local function profile()
	local pl = Player.generate(Rng.new(1), { age = 20, pos = "FW", rarity = "rare", level = 45 })
	pl.id = "p1"
	local other = Player.generate(Rng.new(2), { age = 20, pos = "DF", rarity = "rare", level = 45 })
	other.id = "p2"
	return {
		coins = 100000,
		players = { p1 = pl, p2 = other },
		training = { slots = { false } },
		facilities = { training = 1 },
	}
end

test("Training check accepts a valid start", function()
	local ok, why = Training.check(profile(), 1, "p1", "pace")
	assert(ok, tostring(why))
end)

test("Training check rejects bad starts", function()
	local p = profile()
	assert(not Training.check(p, 1, "nope", "pace"), "unknown player")
	assert(not Training.check(p, 2, "p1", "pace"), "slot beyond level")
	assert(not Training.check(p, 1, "p1", "bogus" :: any), "unknown stat")
	p.coins = 0
	assert(not Training.check(p, 1, "p1", "pace"), "no coins")
	p.coins = 100000
	p.players.p1.r.pace = p.players.p1.potential
	assert(not Training.check(p, 1, "p1", "pace"), "at potential")
	p.players.p1.r.pace = 40
	p.training.slots[1] = { playerId = "p2", stat = "pace", endsAt = 10 }
	assert(not Training.check(p, 1, "p1", "pace"), "slot taken")
	p.facilities.training = 2
	assert(not Training.check(p, 2, "p2", "pace"), "player already training")
	assert(Training.check(p, 2, "p1", "pace"))
end)

test("Training apply never exceeds potential", function()
	local p = profile().players.p1
	p.r.pace = p.potential - 1
	Training.apply(p, "pace", 5)
	assert(p.r.pace == p.potential)
end)

test("Training cost rises with the rating and falls in time with the level", function()
	local c1, s1 = Training.cost(1, 40)
	local c2, s2 = Training.cost(1, 70)
	local _, s3 = Training.cost(3, 40)
	assert(c2 > c1 and s2 > s1 and s3 < s1 and c1 > 0)
end)

test("Training slots grow with the facility level and cap", function()
	assert(Training.slots(1) == 1 and Training.slots(2) == 2 and Training.slots(5) == 4)
end)
