local Contracts = shared("Contracts")
local Destinations = shared("Config/Destinations")
local Tuning = shared("Config/Tuning")

local function sameRoll(a, b)
	for i, c in a do
		local d = b[i]
		if c.kind ~= d.kind or c.target ~= d.target or c.reward ~= d.reward or c.dest ~= d.dest then
			return false
		end
	end
	return #a == #b
end

test("contracts: same day and stage roll the same, kinds are distinct", function()
	for day = 20000, 20060 do
		local a, b = Contracts.roll(day, 3), Contracts.roll(day, 3)
		assert(sameRoll(a, b), "deterministic")
		assert(#a == Tuning.contracts.count, "count")
		local seen = {}
		for _, c in a do
			assert(not seen[c.kind], `duplicate kind {c.kind} on day {day}`)
			seen[c.kind] = true
		end
	end
end)

test("contracts: target and reward formulas", function()
	local templates = {}
	for _, t in Tuning.contracts.templates do
		templates[t.kind] = t
	end
	for stage = 1, 6 do
		local mult = Tuning.stageRewardMult[stage]
		for day = 100, 140 do
			for _, c in Contracts.roll(day, stage) do
				local t = templates[c.kind]
				local i = table.find(t.targets, c.target / (if t.scales then mult else 1))
				assert(i, `{c.kind} target {c.target} stage {stage}`)
				assert(c.reward == t.reward * i * mult, `{c.kind} reward {c.reward}`)
				assert(c.progress == 0 and c.claimed == false, "fresh")
			end
		end
	end
end)

test("contracts: tripsTo destination is unlocked at the stage", function()
	local found = false
	for stage = 1, 6 do
		for day = 1, 300 do
			for _, c in Contracts.roll(day, stage) do
				if c.kind == "tripsTo" then
					found = true
					assert(c.dest and Destinations.byId[c.dest].stage <= stage, `{c.dest} at stage {stage}`)
				else
					assert(c.dest == nil, "dest only on tripsTo")
				end
			end
		end
	end
	assert(found, "no tripsTo rolled")
end)

test("contracts: ensure re-rolls only on a new day", function()
	local state = { day = 0, list = {} }
	assert(Contracts.ensure(state, 50, 1) and #state.list == 3, "first roll")
	state.list[1].progress = 1
	assert(not Contracts.ensure(state, 50, 1) and state.list[1].progress == 1, "same day kept")
	assert(Contracts.ensure(state, 51, 1) and state.list[1].progress == 0, "new day")
end)

test("contracts: bump, claim and labels", function()
	local list = {
		{ kind = "trips", target = 5, reward = 6000, progress = 0, claimed = false },
		{ kind = "tripsTo", dest = "moon", target = 3, reward = 7000, progress = 0, claimed = false },
		{ kind = "earned", target = 60000, reward = 8000, progress = 0, claimed = false },
		{ kind = "passengers", target = 150, reward = 6000, progress = 0, claimed = false },
		{ kind = "planned", target = 2, reward = 5000, progress = 0, claimed = false },
	}
	Contracts.bump(list, "tripsTo", 1, "leo")
	assert(list[2].progress == 0, "wrong dest ignored")
	Contracts.bump(list, "tripsTo", 1, "moon")
	assert(list[2].progress == 1, "matching dest")
	assert(Contracts.claim(list, 1) == nil, "claim before done")
	Contracts.bump(list, "trips", 99, nil)
	assert(list[1].progress == 5, "capped at target")
	assert(Contracts.claim(list, 1) == 6000 and list[1].claimed, "claim")
	assert(Contracts.claim(list, 1) == nil, "second claim")
	assert(Contracts.claim(list, 9) == nil, "bad index")

	local want = {
		"Fly 5 trips",
		"Fly 3 trips to The Moon",
		"Earn $60K from trips",
		"Carry 150 passengers",
		"Plan 2 new missions",
	}
	for i, c in list do
		local label = Contracts.label(c)
		assert(label == want[i], label)
		assert(not label:find("[\128-\255]"), "non-ASCII label")
	end
end)
