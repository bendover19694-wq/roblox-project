local NameGen = shared("NameGen")
local Names = shared("Config/Names")

test("NameGen same seed same name", function()
	assert(NameGen.player(123) == NameGen.player(123))
end)

test("NameGen names are fictional and well formed", function()
	for seed = 1, 5000 do
		local name = NameGen.player(seed)
		assert(not NameGen.isBlocked(name), name)
		local first, last = name:match("^(%a+) (%a+)$")
		assert(first and last, name)
		for _, w in { first, last } do
			assert(#w >= 3 and #w <= 12, name)
			assert(w:match("^%u%l+$"), name)
		end
	end
end)

test("NameGen variety", function()
	local seen, n = {}, 0
	for seed = 1, 1000 do
		local name = NameGen.player(seed)
		if not seen[name] then
			seen[name] = true
			n += 1
		end
	end
	assert(n >= 900, tostring(n))
end)

test("NameGen.isBlocked is case-insensitive substring", function()
	local word = Names.blocked[1]
	assert(NameGen.isBlocked("x " .. word:upper() .. " y"), word)
	assert(not NameGen.isBlocked("Zorvan Quillet"))
end)

test("Names lists never shrink", function()
	for key, min in Names.MIN_LENGTHS do
		assert(#(Names :: any)[key] >= min, key)
	end
end)

test("NameGen club names", function()
	assert(NameGen.club(1, 1) == Names.places[1] .. " " .. Names.suffixes[1])
	for seed = 1, 200 do
		local p, s = NameGen.aiClub(seed, { 3, 4 })
		assert(not (p == 3 and s == 4), "avoided pair returned")
		assert(Names.places[p] and Names.suffixes[s])
	end
end)
