local ProfileSchema = shared("ProfileSchema")

test("garbage or missing data becomes a default profile", function()
	for _, junk in { nil, 5, "x", true } do
		local p = ProfileSchema.migrate(junk)
		assert(p.version == ProfileSchema.VERSION and p.coins == 0, "default expected")
	end
end)

test("migration keeps existing values and fills new fields", function()
	local p = ProfileSchema.migrate({ coins = 77, stats = { nights = 3 } })
	assert(p.coins == 77 and p.stats.nights == 3, "kept values")
	assert(
		p.stats.correct == 0 and type(p.logbook) == "table" and p.settings.reducedMotion == false,
		"filled"
	)
end)

test("migration is idempotent", function()
	local p = ProfileSchema.migrate({ coins = 5 })
	local again = ProfileSchema.migrate(p)
	assert(again.coins == 5 and again.version == ProfileSchema.VERSION, "idempotent")
end)

test("defaults are not shared between profiles", function()
	local a, b = ProfileSchema.default(), ProfileSchema.default()
	a.logbook.x = 1
	assert(b.logbook.x == nil, "shared table leak")
	local m1, m2 = ProfileSchema.migrate({}), ProfileSchema.migrate({})
	m1.tips.y = true
	assert(m2.tips.y == nil, "shared table leak after migrate")
end)
