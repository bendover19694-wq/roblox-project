local Rng = shared("Rng")

test("Rng same seed same sequence", function()
	local a, b = Rng.new(42), Rng.new(42)
	for _ = 1, 100 do
		assert(Rng.next(a) == Rng.next(b), "sequences differ")
	end
end)

test("Rng range", function()
	local r = Rng.new(5)
	local counts = { 0, 0, 0, 0, 0, 0 }
	for _ = 1, 10000 do
		local v = Rng.int(r, 1, 6)
		assert(v >= 1 and v <= 6 and v == math.floor(v), "out of range")
		counts[v] += 1
	end
	for face = 1, 6 do
		assert(counts[face] >= 1400 and counts[face] <= 1950, `face {face}: {counts[face]}`)
	end
end)

test("Rng seed 0 works", function()
	local v = Rng.next(Rng.new(0))
	assert(v >= 0 and v < 1, tostring(v))
end)

test("Rng consecutive seeds are not correlated", function()
	local sum = 0
	for s = 1, 2000 do
		sum += Rng.next(Rng.new(s))
	end
	local mean = sum / 2000
	assert(mean > 0.47 and mean < 0.53, tostring(mean))
end)

test("Rng.pick deterministic and weighted", function()
	local w = { a = 1, b = 1, c = 98 }
	assert(Rng.pick(Rng.new(7), w) == Rng.pick(Rng.new(7), w), "pick differs")
	local r, c = Rng.new(9), 0
	for _ = 1, 10000 do
		if Rng.pick(r, w) == "c" then
			c += 1
		end
	end
	assert(c >= 9700 and c <= 9900, tostring(c))
end)
