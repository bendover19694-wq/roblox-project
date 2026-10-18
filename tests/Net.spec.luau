local Net = shared("Net")

test("isInt accepts whole numbers in range only", function()
	assert(Net.isInt(1, 1, 3) and Net.isInt(3, 1, 3), "edges")
	assert(not Net.isInt(1.5, 1, 3), "fraction")
	assert(not Net.isInt(0 / 0, 1, 3), "NaN")
	assert(not Net.isInt(math.huge, 1, 3) and not Net.isInt(-math.huge, -5, 3), "inf")
	assert(not Net.isInt(0, 1, 3) and not Net.isInt(4, 1, 3), "out of range")
	assert(not Net.isInt("1", 1, 3) and not Net.isInt(nil, 1, 3), "wrong type")
end)

test("isEnum rejects non-members and long strings", function()
	local set = { a = true }
	assert(Net.isEnum("a", set) and not Net.isEnum("b", set), "membership")
	assert(not Net.isEnum(string.rep("a", 40), { [string.rep("a", 40)] = true }), "too long")
end)

test("limiter refills over time", function()
	local now = 0
	local allow = Net.limiter(1, 2, function()
		return now
	end)
	assert(allow("k") and allow("k") and not allow("k"), "burst of 2")
	now = 1
	assert(allow("k") and not allow("k"), "one refilled")
end)
