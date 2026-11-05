local ProfileSchema = shared("ProfileSchema")

local KEYS = {
	"version",
	"club",
	"coins",
	"fans",
	"players",
	"nextPlayerId",
	"lineup",
	"tactic",
	"nextMatchId",
	"training",
	"academy",
	"facilities",
	"market",
	"legends",
	"stats",
	"lastSeen",
	"funnel",
	"tips",
	"settings",
	"receipts",
	"telemetry",
}

test("ProfileSchema default has every top-level key", function()
	local d = ProfileSchema.default()
	for _, k in KEYS do
		assert(d[k] ~= nil, "missing " .. k)
	end
	assert(d.version == ProfileSchema.VERSION and d.club.place == 0)
	assert(d.lineup.formation == "4-4-2" and d.tactic == "balanced")
	assert(d.facilities.stadium == 1 and d.facilities.training == 1 and d.facilities.academy == 1)
	assert(d.academy.charges == 1 and d.stats.trainings == 0)
end)

test("ProfileSchema migrate(nil) is the default", function()
	local m = ProfileSchema.migrate(nil)
	assert(m.version == ProfileSchema.VERSION and m.coins == ProfileSchema.default().coins)
end)

test("ProfileSchema migrate keeps data and fills the rest", function()
	local m = ProfileSchema.migrate({ version = 1, coins = 5, stats = { played = 3 } })
	assert(m.coins == 5 and m.stats.played == 3 and m.stats.won == 0 and m.academy.charges == 1)
end)

test("ProfileSchema migrate is idempotent", function()
	local once = ProfileSchema.migrate({ version = 0, coins = 9 })
	local twice = ProfileSchema.migrate(table.clone(once))
	assert(twice.coins == 9 and twice.version == once.version)
	assert(twice.lineup.formation == once.lineup.formation)
end)

test("ProfileSchema default arrays have no holes", function()
	local d = ProfileSchema.default()
	for i = 1, #d.training.slots do
		assert(d.training.slots[i] ~= nil)
	end
	assert(#d.training.slots == 1 and d.training.slots[1] == false)
end)
