local Economy = shared("Economy")
local Player = shared("Player")
local Rng = shared("Rng")

test("Economy offline is capped and safe", function()
	assert(Economy.offline(1, 100, 99 * 3600) == Economy.offline(1, 100, 8 * 3600))
	assert(Economy.offline(1, 100, -50) == 0)
	assert(Economy.offline(1, 100, 0 / 0) == 0)
	assert(Economy.offline(1, 100, 4 * 3600) > 0)
end)

test("Economy win beats draw beats loss, higher divisions pay more", function()
	for div = 1, 5 do
		assert(Economy.matchReward("win", 0, div) > Economy.matchReward("draw", 0, div))
		assert(Economy.matchReward("draw", 0, div) > Economy.matchReward("loss", 0, div))
		if div < 5 then
			assert(Economy.matchReward("win", 2, div) > Economy.matchReward("win", 2, div + 1))
		end
	end
	assert(Economy.matchReward("loss", 3, 5) > Economy.matchReward("loss", 0, 5), "goals pay")
end)

test("Economy facility costs grow with level", function()
	for _, f in { "stadium", "training", "academy" } do
		assert(Economy.facilityCost(f :: any, 3) > Economy.facilityCost(f :: any, 2))
	end
end)

test("Economy gate grows with stadium and fans", function()
	assert(Economy.gate(2, 100) > Economy.gate(1, 100))
	assert(Economy.gate(1, 1000) > Economy.gate(1, 100))
end)

test("Economy fans delta is never negative, wins pay most", function()
	for div = 1, 5 do
		assert(Economy.fansDelta("win", div) > Economy.fansDelta("draw", div))
		assert(Economy.fansDelta("loss", div) >= 0)
	end
end)

test("Economy season prize rewards a better place", function()
	for div = 1, 5 do
		for place = 1, 5 do
			assert(Economy.seasonPrize(div, place) > Economy.seasonPrize(div, place + 1))
		end
	end
end)

test("Economy player value rises with overall and youth potential", function()
	local weak = Player.generate(Rng.new(1), { age = 27, pos = "MF", rarity = "common", level = 40 })
	local strong = Player.generate(Rng.new(1), { age = 27, pos = "MF", rarity = "common", level = 70 })
	assert(Economy.playerValue(strong) > Economy.playerValue(weak))
	local old = table.clone(strong)
	old.age = 34
	assert(Economy.playerValue(old) < Economy.playerValue(strong))
	assert(Economy.playerValue(weak) >= 20)
end)
