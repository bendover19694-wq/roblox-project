local Payout = shared("Payout")
local Net = shared("Net")

local function stats(over)
	local s = {
		crewCorrect = 10,
		correct = 4,
		crates = 5,
		nets = 1,
		failed = false,
		friends = 0,
		firstNightToday = false,
	}
	for k, v in over or {} do
		s[k] = v
	end
	return s
end

test("payout formula matches the economy doc", function()
	local coins, xp = Payout.night(stats())
	-- 40 + 5*10 + 4*4 + 3*5 + 10*1 = 131
	assert(coins == 131 and xp == 131, `got {coins}/{xp}`)
end)

test("failed nights pay half, first night of the day doubles XP only", function()
	local coins = Payout.night(stats({ failed = true }))
	assert(coins == 65, `failed coins {coins}`)
	local c2, xp2 = Payout.night(stats({ firstNightToday = true }))
	assert(c2 == 131 and xp2 == 262, `first-night {c2}/{xp2}`)
end)

test("crew bonus caps at 3 friends", function()
	local three = Payout.night(stats({ friends = 3 }))
	local ten = Payout.night(stats({ friends = 10 }))
	assert(three == ten and three == math.floor(131 * 1.3), `friend bonus {three}/{ten}`)
end)

test("payout is clamped and reports the clamp", function()
	local coins, _, clamped = Payout.night(stats({ crewCorrect = 1000 }))
	assert(coins == 600 and clamped, "clamp missing")
end)

test("rank curve matches the doc (rank 10 at about 2,520 XP)", function()
	assert(Payout.rankFor(0) == 1, "start rank")
	assert(Payout.rankFor(149) == 1 and Payout.rankFor(150) == 2, "rank 2 boundary")
	local r = Payout.rankFor(2520)
	assert(r == 10, `rank at 2520 = {r}`)
	assert(Payout.rankFor(1e9) == 30, "max rank")
end)

test("rank titles", function()
	assert(Payout.titleFor(1) == "Deckhand" and Payout.titleFor(3) == "Deckhand", "deckhand")
	assert(Payout.titleFor(4) == "Lamplighter" and Payout.titleFor(30) == "Keeper of the Bell", "titles")
end)

test("Net validators reject junk", function()
	local set = { Mimic = true }
	assert(Net.isEnum("Mimic", set) and not Net.isEnum("mimic", set) and not Net.isEnum(5, set), "enum")
	assert(not Net.isEnum(string.rep("a", 100), { [string.rep("a", 100)] = true }), "long string")
	assert(Net.isVector({ X = 1, Y = 2, Z = 3 }), "vector ok")
	assert(not Net.isVector({ X = 0 / 0, Y = 0, Z = 0 }), "NaN")
	assert(not Net.isVector({ X = math.huge, Y = 0, Z = 0 }), "inf")
end)

test("rate limiter allows a burst then throttles, then refills", function()
	local t = 0
	local allow = Net.limiter(1, 3, function()
		return t
	end)
	assert(allow("p") and allow("p") and allow("p"), "burst of 3")
	assert(not allow("p"), "4th blocked")
	assert(allow("q"), "keys are independent")
	t = 1.01
	assert(allow("p") and not allow("p"), "refills one per second")
end)
