local ProfileSchema = shared("ProfileSchema")

test("a v1 profile migrates to v2 and keeps its settings", function()
	local old = { version = 1, cash = 7, settings = { reducedMotion = true } }
	local p = ProfileSchema.migrate(old)
	assert(p.version == 2 and p.cash == 7, "version and cash")
	assert(p.settings.reducedMotion == true, "reducedMotion kept")
	assert(p.settings.sound == true, "sound defaults on")
	assert(p.research.engines == 0 and p.research.efficiency == 0 and p.research.comfort == 0, "research")
	assert(p.gifts.next == 1 and p.gifts.played == 0, "gifts")
	assert(type(p.contracts.list) == "table" and p.contracts.day == 0, "contracts")
end)

test("a saved sound-off setting is not overwritten", function()
	local p = ProfileSchema.migrate({ version = 2, settings = { sound = false } })
	assert(p.settings.sound == false and p.settings.reducedMotion == false, "sound off kept")
end)

test("migrating twice changes nothing", function()
	local a = ProfileSchema.migrate({ version = 1, research = { engines = 3 } })
	local b = ProfileSchema.migrate(a)
	assert(b.research.engines == 3 and b.version == 2, "idempotent")
end)

test("fresh defaults never share tables", function()
	local a, b = ProfileSchema.default(), ProfileSchema.default()
	a.research.engines = 5
	a.contracts.list[1] = {}
	a.gifts.played = 9
	a.settings.sound = false
	assert(b.research.engines == 0 and #b.contracts.list == 0 and b.gifts.played == 0, "shared tables")
	assert(b.settings.sound == true, "shared settings")
end)
