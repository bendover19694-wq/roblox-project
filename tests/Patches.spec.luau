local Patches = shared("Patches")
local ProfileSchema = shared("ProfileSchema")
local Destinations = shared("Config/Destinations")
local Career = shared("Config/Career")

local function earnedIds(list)
	local out = {}
	for _, p in list do
		if p.earned then
			out[p.id] = true
		end
	end
	return out
end

test("a fresh profile has only the first stage patch", function()
	local p = ProfileSchema.default()
	local list = Patches.list(p.stats.visited, p.career.stage)
	assert(#list == #Destinations.list + #Career.stages, "one patch per destination and stage")
	local got = earnedIds(list)
	assert(got["stage:1"] and not got["stage:2"], "stage patches")
	local n = 0
	for _ in got do
		n += 1
	end
	assert(n == 1, `earned {n}`)
	local e, total = Patches.count(list)
	assert(e == 1 and total == #list, "count")
end)

test("visiting the moon earns its patch; higher stages earn stage patches", function()
	local list = Patches.list({ moon = true }, 3)
	local got = earnedIds(list)
	assert(got["dest:moon"] and not got["dest:leo"], "moon")
	assert(got["stage:1"] and got["stage:2"] and got["stage:3"] and not got["stage:4"], "stages")
	assert(select(1, Patches.count(list)) == 4, "count")
	assert(list[1].id == "dest:leo" and list[1].code == "LEO", "destination order")
end)
