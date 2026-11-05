local Market = shared("Market")
local Economy = shared("Economy")
local Tuning = shared("Config/Tuning")

test("Market daily is deterministic per user and day", function()
	local a, b = Market.daily(42, 20000, 5), Market.daily(42, 20000, 5)
	assert(#a == Tuning.market.size)
	for i, p in a do
		assert(p.nameSeed == b[i].nameSeed and p.pos == b[i].pos and p.potential == b[i].potential)
		assert(Economy.playerValue(p) > 0)
	end
	local c = Market.daily(42, 20001, 5)
	local differs = false
	for i, p in a do
		if p.nameSeed ~= c[i].nameSeed then
			differs = true
		end
	end
	assert(differs, "next day must differ")
	assert(Market.daily(43, 20000, 5)[1].nameSeed ~= a[1].nameSeed, "other user must differ")
end)
