local Match = shared("Match")

local function teamSide(level, seed)
	return Match.aiSide(level, seed)
end

local function same(a, b)
	assert(#a.moments == #b.moments, "moment count")
	for i, mo in a.moments do
		local o = b.moments[i]
		assert(
			mo.minute == o.minute
				and mo.kind == o.kind
				and mo.side == o.side
				and mo.playerId == o.playerId
				and mo.at == o.at
		)
	end
	assert(a.score[1] == b.score[1] and a.score[2] == b.score[2])
end

test("Match deterministic", function()
	local h, a = teamSide(50, 1), teamSide(50, 2)
	local m1 = Match.kickoff(99, h, a, "balanced", 0)
	local m2 = Match.kickoff(99, h, a, "balanced", 0)
	Match.advance(m1, 100)
	Match.advance(m2, 100)
	same(m1, m2)
	assert(Match.isFinal(m1) and m1.segment == 3)
end)

test("Match never simulates the future", function()
	local m = Match.kickoff(5, teamSide(50, 1), teamSide(50, 2), "balanced", 0)
	assert(m.segment == 1 and not Match.isFinal(m))
	for _, mo in Match.visible(m, 0) do
		assert(mo.at <= 0)
	end
	assert(Match.advance(m, 12) == false and m.segment == 1)
	assert(Match.advance(m, 13) == true and m.segment == 2)
	assert(Match.advance(m, 13) == false)
	assert(Match.advance(m, 26) == true and m.segment == 3 and Match.isFinal(m))
end)

test("Match tactic applies to the next segment only", function()
	local m = Match.kickoff(5, teamSide(50, 1), teamSide(50, 2), "balanced", 0)
	assert(Match.setTactic(m, "attack", 5))
	Match.advance(m, 13)
	assert(m.tactics[1] == "balanced" and m.tactics[2] == "attack")
	Match.advance(m, 26)
	assert(not Match.setTactic(m, "defend", 27), "final match accepts a tactic")
end)

test("Match finish equals advancing with the same tactic", function()
	local h, a = teamSide(55, 3), teamSide(50, 4)
	local m1 = Match.kickoff(7, h, a, "press", 0)
	local m2 = Match.kickoff(7, h, a, "press", 0)
	Match.finish(m1, 1)
	Match.advance(m2, 99)
	assert(Match.isFinal(m1) and m1.segment == 3)
	same(m1, m2)
	assert(#Match.visible(m1, 1) == #m1.moments, "skip must show everything")
	assert(Match.isDone(m1, 1) and not Match.isDone(m2, 30) and Match.isDone(m2, 39))
end)

test("Match moments are consistent", function()
	local Cfg = shared("Config/Match")
	for seed = 1, 200 do
		local h, a = teamSide(50, seed), teamSide(50, seed + 1000)
		local m = Match.kickoff(seed, h, a, "balanced", 0)
		Match.finish(m, 0)
		local goals = { 0, 0 }
		local ids = { home = {}, away = {} }
		for _, sc in h.scorers do
			ids.home[sc.id] = true
		end
		for _, sc in a.scorers do
			ids.away[sc.id] = true
		end
		for _, mo in m.moments do
			assert(mo.kind == "goal" or mo.kind == "save" or mo.kind == "miss" or mo.kind == "bigChance")
			local seg = if mo.minute <= 30 then 1 elseif mo.minute <= 60 then 2 else 3
			assert(mo.minute >= Cfg.segments[seg][1] and mo.minute <= Cfg.segments[seg][2])
			assert(ids[mo.side][mo.playerId], "player not in the side")
			if mo.kind == "goal" then
				goals[if mo.side == "home" then 1 else 2] += 1
			end
		end
		assert(goals[1] == m.score[1] and goals[2] == m.score[2])
	end
end)

local function run(levelH, levelA, tacH, n)
	local goals, hw, d = 0, 0, 0
	for seed = 1, n do
		local m = Match.kickoff(seed, teamSide(levelH, seed * 2), teamSide(levelA, seed * 2 + 1), tacH, 0)
		Match.finish(m, 0)
		goals += m.score[1] + m.score[2]
		if m.score[1] > m.score[2] then
			hw += 1
		elseif m.score[1] == m.score[2] then
			d += 1
		end
	end
	return goals / n, hw / n, d / n
end

test("Match distribution: goals per match", function()
	local mean = run(50, 50, "balanced", 2000)
	assert(mean >= 2.4 and mean <= 3.2, tostring(mean))
end)

test("Match distribution: equal sides draw 22 to 32 percent", function()
	local _, _, d = run(50, 50, "balanced", 2000)
	assert(d >= 0.22 and d <= 0.32, tostring(d))
end)

test("Match distribution: +10 overall wins 60 to 75 percent", function()
	local _, w = run(60, 50, "balanced", 2000)
	assert(w >= 0.60 and w <= 0.75, tostring(w))
end)

test("Match distribution: attack vs defend changes goals by 0.3", function()
	local a = run(50, 50, "attack", 2000)
	local d = run(50, 50, "defend", 2000)
	assert(a - d >= 0.3, a .. " " .. d)
end)
