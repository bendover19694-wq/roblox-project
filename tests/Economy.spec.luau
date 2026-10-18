local Economy = shared("Economy")
local Rockets = shared("Config/Rockets")
local Destinations = shared("Config/Destinations")
local Career = shared("Config/Career")
local ProfileSchema = shared("ProfileSchema")
local Format = shared("Format")

test("starter rocket profits on its starter routes", function()
	for _, dest in { "leo", "station" } do
		local t = Economy.trip("sparrow", dest, "standard", "comfort")
		assert(t.profit > 0, `sparrow to {dest} loses money: {t.profit}`)
		assert(t.load > 0 and t.load <= 1, "load out of range")
	end
end)

test("every rocket profits on the farthest stage-appropriate destination it can reach", function()
	for _, r in Rockets.list do
		local best = nil
		for _, d in Destinations.list do
			if
				d.stage <= r.stage
				and Economy.canReach(r.id, d.id)
				and (not best or d.distance > best.distance)
			then
				best = d
			end
		end
		assert(best, `{r.id} reaches nothing`)
		local t = Economy.trip(r.id, best.id, "standard", "comfort")
		assert(t.profit > 0, `{r.id} to {best.id} profit {t.profit}`)
	end
end)

test("each new rocket pays for itself in under 30 trips on a fitting route", function()
	for _, r in Rockets.list do
		local bestProfit = 0
		for _, d in Destinations.list do
			if d.stage <= r.stage and Economy.canReach(r.id, d.id) then
				bestProfit = math.max(bestProfit, Economy.trip(r.id, d.id, "standard", "comfort").profit)
			end
		end
		assert(
			bestProfit > 0 and r.price / bestProfit < 30,
			`{r.id}: {r.price / math.max(bestProfit, 1)} trips to pay off`
		)
	end
end)

test("trip time is clamped, and fast launch is faster", function()
	for _, r in Rockets.list do
		for _, d in Destinations.list do
			if Economy.canReach(r.id, d.id) then
				local t = Economy.tripSeconds(r.id, d.id)
				assert(t >= 30 and t <= 180, `{r.id}->{d.id} {t}s`)
				assert(Economy.tripSeconds(r.id, d.id, true) < t, "fast launch not faster")
			end
		end
	end
end)

test("2x cash doubles only positive profit", function()
	local a = Economy.trip("kestrel", "leo", "standard", "comfort")
	local b = Economy.trip("kestrel", "leo", "standard", "comfort", 2)
	assert(b.profit == a.profit * 2 or b.profit == a.profit * 2 - 1, "doubling")
end)

test("rocket range gates destinations", function()
	assert(Economy.canReach("sparrow", "leo") and not Economy.canReach("sparrow", "moon"), "sparrow range")
	assert(Economy.canReach("phoenix", "titan"), "phoenix reaches titan")
end)

test("goal values and stage progress", function()
	local p = ProfileSchema.default()
	local _, goals = Economy.stageProgress(p)
	assert(#goals == #Career.stages[1].goals and not goals[1].done, "fresh profile")
	p.stats.planned = 1
	p.stats.visited.moon = true
	assert(Economy.goalValue(p, { kind = "planned" }) == 1, "planned")
	assert(
		Economy.goalValue(p, { kind = "visited:moon" }) == 1
			and Economy.goalValue(p, { kind = "visited:mars" }) == 0,
		"visited"
	)
	p.missions = {
		{ dest = "leo", service = "luxury", lastLoad = 1 },
		{ dest = "leo", service = "basic", lastLoad = 0.5 },
	}
	assert(Economy.goalValue(p, { kind = "served" }) == 1, "served distinct")
	local r = Economy.rating(p.missions)
	assert(r > 3 and r < 4, `rating {r}`)
end)

test("offline catch-up counts whole cycles only", function()
	local n, nextArrive = Economy.tripsBetween(100, 0, 99, 30)
	assert(n == 0 and nextArrive == 100, "none yet")
	n, nextArrive = Economy.tripsBetween(100, 0, 100, 30)
	assert(n == 1 and nextArrive == 134, `one {n} {nextArrive}`)
	n = Economy.tripsBetween(100, 0, 100 + 34 * 10, 30)
	assert(n == 11, `eleven {n}`)
end)

test("money formatting", function()
	assert(Format.money(999) == "$999", Format.money(999))
	assert(Format.money(1500) == "$1.5K", Format.money(1500))
	assert(Format.money(2000000) == "$2M", Format.money(2000000))
	assert(Format.money(-4200) == "-$4.2K", Format.money(-4200))
	assert(Format.int(1234567) == "1,234,567", Format.int(1234567))
	assert(Format.duration(75) == "1m 15s", Format.duration(75))
end)

test("profile migration fills new fields and keeps values", function()
	local p = ProfileSchema.migrate({ cash = 5, stats = { trips = 3 } })
	assert(
		p.cash == 5 and p.stats.trips == 3 and p.stats.passengers == 0 and type(p.rockets) == "table",
		"migrate"
	)
	assert(ProfileSchema.migrate(nil).cash > 0, "default cash")
	local a, b = ProfileSchema.default(), ProfileSchema.default()
	a.stats.visited.x = true
	assert(b.stats.visited.x == nil, "shared table")
end)

test("research speedMult shortens trips", function()
	local base = Economy.tripSeconds("kestrel", "moon")
	local fast = Economy.tripSeconds("kestrel", "moon", false, 1.3)
	assert(fast < base, `{fast} vs {base}`)
	assert(Economy.tripSeconds("kestrel", "moon", false, nil) == base, "nil speedMult is neutral")
end)

test("research fuelMult lowers fuel and raises profit", function()
	local a = Economy.trip("kestrel", "leo", "standard", "comfort")
	local b = Economy.trip("kestrel", "leo", "standard", "comfort", nil, { fuelMult = 0.6, demandMult = 1 })
	assert(b.fuel < a.fuel and b.profit > a.profit, `fuel {b.fuel}/{a.fuel} profit {b.profit}/{a.profit}`)
end)

test("research demandMult never fills past capacity", function()
	local fx = { fuelMult = 1, demandMult = 50 }
	for _, r in Rockets.list do
		for _, d in Destinations.list do
			local t = Economy.trip(r.id, d.id, "budget", "luxury", nil, fx)
			assert(t.filled <= r.capacity and t.load <= 1, `{r.id}->{d.id} filled {t.filled}`)
		end
	end
	local lo = Economy.trip("sparrow", "leo", "standard", "basic")
	local hi = Economy.trip("sparrow", "leo", "standard", "basic", nil, { fuelMult = 1, demandMult = 1.2 })
	assert(hi.filled >= lo.filled, "more demand never fills fewer seats")
end)

test("Economy.earn counts only positive amounts as lifetime earnings", function()
	local p = { cash = 100, lifetimeEarned = 0 }
	Economy.earn(p, 50)
	assert(p.cash == 150 and p.lifetimeEarned == 50, "gain")
	Economy.earn(p, -30)
	assert(p.cash == 120 and p.lifetimeEarned == 50, "loss")
end)
