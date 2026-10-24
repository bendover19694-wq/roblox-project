local LiveStats = shared("LiveStats")
local Tuning = shared("Config/Tuning")

local DAY = 86400
local T0 = 20000 * DAY + 12 * 3600 -- noon UTC on an arbitrary day

local function setup()
	local clock = { now = T0 }
	local agg = LiveStats.new(function()
		return clock.now
	end, "srvA", "12")
	return agg, clock
end

local function joinEvent(userId: number, isNew: boolean, extra: any?)
	local e = {
		userId = userId,
		isNew = isNew,
		source = "direct",
		device = "phone",
		country = "US",
		language = "en-us",
		version = "12",
	}
	for k, v in extra or {} do
		e[k] = v
	end
	return e
end

local function eq(a: any, b: any, label: string)
	assert(a == b, `{label}: expected {tostring(b)}, got {tostring(a)}`)
end

test("joins count new and returning players, sources, devices and who is in the server", function()
	local agg = setup()
	LiveStats.join(agg, joinEvent(1, true))
	LiveStats.join(agg, joinEvent(2, true, { source = "friend", device = "pc" }))
	LiveStats.join(agg, joinEvent(3, false, { daysSinceFirst = 1 }))
	local s = LiveStats.snapshot(agg, T0)
	eq(s.joins, 3, "joins")
	eq(s.newJoins, 2, "newJoins")
	eq(s.returningJoins, 1, "returningJoins")
	eq(s.uniqueNew, 2, "uniqueNew")
	eq(s.uniqueReturning, 1, "uniqueReturning")
	eq(s.sources.direct.joins, 2, "direct joins")
	eq(s.sources.direct.newJoins, 1, "direct newJoins")
	eq(s.sources.friend.newJoins, 1, "friend newJoins")
	eq(s.devices.phone, 2, "phone")
	eq(s.devices.pc, 1, "pc")
	eq(s.countries.US, 3, "country")
	eq(s.versions["12"], 3, "version")
	eq(s.playing, 3, "playing")
	eq(s.peak, 3, "peak")
end)

test("D1 and D7 come from the account age of returning players, once per player per day", function()
	local agg, clock = setup()
	LiveStats.join(agg, joinEvent(1, false, { daysSinceFirst = 1, source = "friend" }))
	LiveStats.join(agg, joinEvent(1, false, { daysSinceFirst = 1, source = "friend" })) -- rejoin the same day
	LiveStats.join(agg, joinEvent(2, false, { daysSinceFirst = 7 }))
	LiveStats.join(agg, joinEvent(3, false, { daysSinceFirst = 3 })) -- neither D1 nor D7
	LiveStats.join(agg, joinEvent(4, false)) -- legacy player: age unknown
	local s = LiveStats.snapshot(agg, clock.now)
	eq(s.returningByAge["1"], 1, "age 1 counted once")
	eq(s.returningByAge["7"], 1, "age 7")
	eq(s.returningByAge["3"], nil, "other ages are not stored")
	eq(s.sources.friend.d1, 1, "friend d1")
	eq(s.sources.direct.d7, 1, "direct d7")
	eq(s.sources.friend.joins, 2, "both joins still counted")
end)

test("uniques are per day; a new day counts the same player again", function()
	local agg, clock = setup()
	LiveStats.join(agg, joinEvent(1, true))
	LiveStats.leave(agg, { userId = 1, sessionSeconds = 100 })
	LiveStats.join(agg, joinEvent(1, false))
	eq(LiveStats.snapshot(agg, clock.now).uniqueNew, 1, "new once")
	eq(LiveStats.snapshot(agg, clock.now).uniqueReturning, 0, "same day, not counted again")
	LiveStats.leave(agg, { userId = 1, sessionSeconds = 100 })
	clock.now += DAY
	LiveStats.join(agg, joinEvent(1, false))
	eq(LiveStats.snapshot(agg, clock.now).uniqueReturning, 1, "next day counts")
	eq(LiveStats.snapshot(agg, clock.now).joins, 3, "joins")
end)

test("leave: session histograms, bounce, where players left, last leave", function()
	local agg, clock = setup()
	LiveStats.join(agg, joinEvent(1, true))
	LiveStats.join(agg, joinEvent(2, true))
	LiveStats.join(agg, joinEvent(3, false))
	clock.now += 30
	LiveStats.leave(agg, { userId = 1, sessionSeconds = 30, lastPlace = "Hangar", tutorialStep = 2 })
	LiveStats.leave(agg, { userId = 2, sessionSeconds = 700, lastPlace = "Shop", tutorialStep = 4 })
	LiveStats.leave(agg, { userId = 3, sessionSeconds = 4000, lastPlace = "Shop" })
	local s = LiveStats.snapshot(agg, clock.now)
	eq(s.leaves, 3, "leaves")
	eq(s.bounces, 1, "bounces are sessions under a minute")
	eq(s.sessions.new.count, 2, "new sessions")
	eq(s.sessions.new.seconds, 730, "new seconds")
	eq(s.sessions.new.hist[1], 1, "under 1 min")
	eq(s.sessions.new.hist[4], 1, "10 to 30 min")
	eq(s.sessions.returning.hist[6], 1, "60+ min")
	eq(s.lastPlaces.Shop, 2, "last place")
	eq(s.tutorialSteps["2"], 1, "tutorial step 2")
	eq(s.tutorialSteps["4"], 1, "tutorial step 4")
	eq(s.lastLeave.lastPlace, "Shop", "latest leave")
	eq(s.lastLeave.seconds, 4000, "latest leave seconds")
	eq(s.playing, 0, "nobody left in the server")
	eq(s.peak, 3, "peak is kept")
end)

test("a leave for someone who never joined is ignored; absurd session lengths are clamped", function()
	local agg = setup()
	LiveStats.leave(agg, { userId = 99, sessionSeconds = 50 })
	eq(LiveStats.snapshot(agg, T0).leaves, 0, "ignored")
	LiveStats.join(agg, joinEvent(1, true))
	LiveStats.leave(agg, { userId = 1, sessionSeconds = -5 })
	LiveStats.join(agg, joinEvent(2, true))
	LiveStats.leave(agg, { userId = 2, sessionSeconds = 1e12 })
	LiveStats.join(agg, joinEvent(3, true))
	LiveStats.leave(agg, { userId = 3, sessionSeconds = 0 / 0 })
	local s = LiveStats.snapshot(agg, T0)
	eq(s.sessions.new.seconds, 24 * 3600, "clamped to a day, negatives and NaN to zero")
end)

test("robux: totals by product, one payer per day, hourly products", function()
	local agg, clock = setup()
	LiveStats.join(agg, joinEvent(1, true))
	LiveStats.robux(agg, { product = "Starter Pack", amount = 99, userId = 1 })
	LiveStats.robux(agg, { product = "Starter Pack", amount = 99, userId = 1 })
	LiveStats.robux(agg, { product = "2x Cash", amount = 199, userId = 2 })
	LiveStats.robux(agg, { product = "Bad", amount = 0, userId = 3 })
	LiveStats.robux(agg, { product = "Bad", amount = -5, userId = 3 })
	local s = LiveStats.snapshot(agg, clock.now)
	eq(s.robux.total, 397, "total")
	eq(s.robux.count, 3, "count")
	eq(s.payers, 2, "payers")
	eq(s.robux.byProduct["Starter Pack"].amount, 198, "starter")
	eq(s.robux.byProduct["Starter Pack"].count, 2, "starter count")
	local hour = s.hours[tostring(math.floor(clock.now / 3600))]
	eq(hour.robux, 397, "hour robux")
	eq(hour.products["2x Cash"], 199, "hour product")
	clock.now += DAY
	LiveStats.robux(agg, { product = "Starter Pack", amount = 99, userId = 1 })
	eq(LiveStats.snapshot(agg, clock.now).payers, 3, "a payer is counted again on a new day")
end)

test("errors: long digit runs are scrubbed, duplicates merge, samples are capped", function()
	local agg = setup()
	LiveStats.error(agg, { message = "Players.987654321.Data attempt to index nil" })
	LiveStats.error(agg, { message = "Players.123456789.Data attempt to index nil" })
	local s = LiveStats.snapshot(agg, T0)
	eq(s.errors.count, 2, "count")
	eq(#s.errors.samples, 1, "same message after scrubbing")
	eq(s.errors.samples[1].count, 2, "sample count")
	assert(not string.find(s.errors.samples[1].message, "987654321", 1, true), "id kept in the message")
	for i = 1, Tuning.stats.maxErrorSamples + 10 do
		LiveStats.error(agg, { message = `distinct error {i}` })
	end
	local capped = LiveStats.snapshot(agg, T0)
	eq(#capped.errors.samples, Tuning.stats.maxErrorSamples, "capped")
	LiveStats.error(agg, { message = string.rep("x", 500) })
	for _, sample in LiveStats.snapshot(agg, T0).errors.samples do
		assert(#sample.message <= Tuning.stats.maxErrorChars, "message too long")
	end
end)

test("perf: frame-rate buckets, crashes, worst ping, and the server summary", function()
	local agg, clock = setup()
	LiveStats.join(agg, joinEvent(1, true))
	LiveStats.perf(agg, { fps = 58, ping = 80 })
	LiveStats.perf(agg, { fps = 40, ping = 210 })
	LiveStats.perf(agg, { fps = 10, crashed = true })
	LiveStats.perf(agg, { fps = 0 / 0 }) -- ignored
	LiveStats.perf(agg, { fps = -3 }) -- ignored
	local s = LiveStats.snapshot(agg, clock.now)
	eq(s.perf.samples, 3, "samples")
	eq(s.perf.fpsSum, 108, "fpsSum")
	eq(s.perf.fpsHist[1], 1, "under 20")
	eq(s.perf.fpsHist[3], 1, "30 to 45")
	eq(s.perf.fpsHist[5], 1, "55+")
	eq(s.perf.crashes, 1, "crashes")
	eq(s.perf.pingMax, 210, "pingMax")
	local sum = LiveStats.serverSummary(agg, clock.now)
	eq(sum.playing, 1, "summary playing")
	eq(sum.fps, 10, "summary fps is the latest sample")
	eq(sum.ping, 210, "summary ping")
	eq(sum.version, "12", "summary version")
end)

test("drain returns only what is new; requeue puts a failed write back", function()
	local agg, clock = setup()
	LiveStats.join(agg, joinEvent(1, true))
	local first = LiveStats.drain(agg, clock.now)
	eq(first.joins, 1, "first delta")
	eq(first.at, clock.now, "delta time")
	LiveStats.join(agg, joinEvent(2, true))
	local second = LiveStats.drain(agg, clock.now)
	eq(second.joins, 1, "second delta has only the new join")
	eq(LiveStats.snapshot(agg, clock.now).joins, 2, "snapshot keeps the total")
	eq(LiveStats.drain(agg, clock.now).joins, 0, "nothing new")
	LiveStats.requeue(agg, second)
	LiveStats.join(agg, joinEvent(3, true))
	local third = LiveStats.drain(agg, clock.now)
	eq(third.joins, 2, "a requeued delta comes back with the next one")
	eq(third.uniqueNew, 2, "uniques come back too")
end)

test("merge adds days together; peaks take the max per server and sum across servers", function()
	local a, clockA = setup()
	local b = LiveStats.new(function()
		return clockA.now
	end, "srvB", "12")
	LiveStats.join(a, joinEvent(1, true))
	LiveStats.join(a, joinEvent(2, true))
	LiveStats.join(b, joinEvent(3, true))
	local day = LiveStats.emptyStats()
	LiveStats.merge(day, LiveStats.drain(a, clockA.now))
	clockA.now += 60
	LiveStats.leave(a, { userId = 2, sessionSeconds = 60 })
	LiveStats.join(a, joinEvent(4, true)) -- srvA back to 2 players: its peak stays 2
	LiveStats.merge(day, LiveStats.drain(a, clockA.now))
	LiveStats.merge(day, LiveStats.drain(b, clockA.now))
	eq(day.joins, 4, "joins")
	eq(day.leaves, 1, "leaves")
	local hour = day.hours[tostring(math.floor(T0 / 3600))]
	eq(hour.peaks.srvA, 2, "one server's peak is a max, not a sum of its flushes")
	eq(hour.peaks.srvB, 1, "other server")
	eq(hour.joins, 4, "hour joins")
	eq(day.sessions.new.count, 1, "sessions merged")
	eq(day.lastLeave.seconds, 60, "last leave")
end)

test("merge tolerates garbage from the datastore and keeps the newest last leave", function()
	local day = LiveStats.emptyStats()
	LiveStats.merge(day, nil)
	LiveStats.merge(day, "oops")
	LiveStats.merge(
		day,
		{ joins = "x", sessions = 5, hours = { a = 1, ["1"] = "bad" }, sources = { x = 3 }, perf = 7 }
	)
	eq(day.joins, 0, "garbage numbers ignored")
	LiveStats.merge(day, { lastLeave = { lastPlace = "A", seconds = 1, at = 100 } })
	LiveStats.merge(day, { lastLeave = { lastPlace = "B", seconds = 2, at = 50 } })
	eq(day.lastLeave.lastPlace, "A", "older leave does not replace a newer one")
	LiveStats.merge(day, { lastLeave = { lastPlace = "C", seconds = 3, at = 200 } })
	eq(day.lastLeave.lastPlace, "C", "newer leave wins")
end)

test("only the newest hourly buckets are kept", function()
	local agg, clock = setup()
	for h = 0, Tuning.stats.hoursKept + 5 do
		clock.now = T0 + h * 3600
		LiveStats.join(agg, joinEvent(1000 + h, true))
	end
	local count = 0
	for _ in LiveStats.snapshot(agg, clock.now).hours do
		count += 1
	end
	eq(count, Tuning.stats.hoursKept, "bucket count")
	eq(LiveStats.snapshot(agg, clock.now).hours[tostring(math.floor(T0 / 3600))], nil, "oldest dropped")
end)

test("the shared live record keeps fresh servers and drops silent ones", function()
	local agg, clock = setup()
	LiveStats.join(agg, joinEvent(1, true))
	local old = {
		at = T0 - 10,
		servers = {
			srvB = { at = T0 - 20, playing = 5, peak = 5, version = "12" },
			srvC = { at = T0 - Tuning.stats.serverStaleSeconds - 1, playing = 9, peak = 9, version = "11" },
			srvA = { at = T0 - 30, playing = 99, peak = 99, version = "11" },
		},
	}
	local rec = LiveStats.mergeLive(old, "srvA", LiveStats.serverSummary(agg, clock.now), clock.now)
	eq(rec.at, clock.now, "record time")
	eq(rec.servers.srvB.playing, 5, "fresh server kept")
	eq(rec.servers.srvC, nil, "silent server dropped")
	eq(rec.servers.srvA.playing, 1, "own line replaced")
	local fresh = LiveStats.mergeLive(nil, "srvA", LiveStats.serverSummary(agg, clock.now), clock.now)
	eq(fresh.servers.srvA.version, "12", "first write")
end)

test("no user id appears anywhere in a snapshot, a delta or the live line", function()
	local agg, clock = setup()
	local ids = { 987654321, 555123456 }
	for _, id in ids do
		LiveStats.join(agg, joinEvent(id, true))
		LiveStats.robux(agg, { product = "Starter Pack", amount = 99, userId = id })
		LiveStats.perf(agg, { fps = 58, ping = 90 })
		LiveStats.leave(agg, { userId = id, sessionSeconds = 120, lastPlace = "Hangar", tutorialStep = 3 })
	end
	local function scan(value: any, where: string)
		if type(value) == "table" then
			for k, v in value do
				scan(k, where)
				scan(v, where)
			end
		elseif type(value) == "number" then
			for _, id in ids do
				assert(value ~= id, `user id found as a number in {where}`)
			end
		elseif type(value) == "string" then
			for _, id in ids do
				assert(not string.find(value, tostring(id), 1, true), `user id found as text in {where}`)
			end
		end
	end
	scan(LiveStats.snapshot(agg, clock.now), "snapshot")
	scan(LiveStats.serverSummary(agg, clock.now), "summary")
	scan(LiveStats.drain(agg, clock.now), "delta")
end)
