local Rng = shared("Rng")
local RuleGrammar = shared("RuleGrammar")
local Ships = shared("Config/Ships")

local function buildRules(rng, count)
	local rules = {}
	for tier = 1, count do
		rules = assert(RuleGrammar.addRule(rng, rules, tier), "addRule returned nil")
	end
	return rules
end

test("Rng stays in range and covers every option", function()
	local rng = Rng.new(42)
	local seen = {}
	for _ = 1, 2000 do
		local v = rng:int(1, 6)
		assert(v >= 1 and v <= 6, `out of range: {v}`)
		seen[v] = true
	end
	for v = 1, 6 do
		assert(seen[v], `never produced {v}`)
	end
end)

test("same seed gives the same night", function()
	local a, b = Rng.new(7), Rng.new(7)
	local ra, rb = buildRules(a, 3), buildRules(b, 3)
	for i = 1, 3 do
		assert(RuleGrammar.describe(ra[i]).text == RuleGrammar.describe(rb[i]).text, "rules differ")
	end
	local sa, sb = RuleGrammar.makeShip(a, ra, true), RuleGrammar.makeShip(b, rb, true)
	for _, attr in Ships.order do
		assert(sa[attr] == sb[attr], `ship differs on {attr}`)
	end
end)

test("1000 nights: rules valid, real ships legal, mimics illegal", function()
	for seed = 1, 1000 do
		local rng = Rng.new(seed)
		local rules = buildRules(rng, 3)
		assert(#rules == 3, "expected 3 rules")
		local used = {}
		for _, r in rules do
			for _, attr in { r.attr, r.ifAttr } do
				assert(not used[attr], `seed {seed}: attribute {attr} used twice`)
				used[attr] = true
			end
		end
		for _ = 1, 20 do
			local real = RuleGrammar.makeShip(rng, rules, false)
			assert(RuleGrammar.isLegal(real, rules) and not real.mimic, `seed {seed}: real ship illegal`)
			local mimic = RuleGrammar.makeShip(rng, rules, true)
			assert(not RuleGrammar.isLegal(mimic, rules) and mimic.mimic, `seed {seed}: mimic passes`)
		end
	end
end)

test("ships only use known attribute values", function()
	local rng = Rng.new(99)
	local rules = buildRules(rng, 3)
	for _ = 1, 200 do
		local ship = RuleGrammar.makeShip(rng, rules, rng:next() < 0.5)
		for _, attr in Ships.order do
			assert(table.find(Ships.attrs[attr], ship[attr]), `bad {attr}: {ship[attr]}`)
		end
	end
end)

test("every rule kind has readable text", function()
	local rng = Rng.new(3)
	local kinds = {}
	for seed = 1, 300 do
		rng = Rng.new(seed)
		for _, r in buildRules(rng, 3) do
			local d = RuleGrammar.describe(r)
			assert(type(d.text) == "string" and #d.text > 3, "empty rule text")
			kinds[r.kind] = true
		end
	end
	assert(kinds.require and kinds.forbid and kinds.pair, "not all rule kinds generated")
end)
