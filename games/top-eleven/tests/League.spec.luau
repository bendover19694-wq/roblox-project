local League = shared("League")
local Rng = shared("Rng")

test("League fixtures: round robin", function()
	local fx = League.fixtures(6)
	assert(#fx == 5)
	local pairs_seen = {}
	local home1 = 0
	for _, day in fx do
		assert(#day == 3)
		local inDay = {}
		for _, g in day do
			assert(not inDay[g[1]] and not inDay[g[2]], "club twice in a matchday")
			inDay[g[1]], inDay[g[2]] = true, true
			local key = math.min(g[1], g[2]) .. "-" .. math.max(g[1], g[2])
			assert(not pairs_seen[key], "pair twice")
			pairs_seen[key] = true
			if g[1] == 1 then
				home1 += 1
			end
		end
	end
	local n = 0
	for _ in pairs_seen do
		n += 1
	end
	assert(n == 15)
	assert(home1 >= 2 and home1 <= 3, tostring(home1))
end)

test("League table is derived with documented tie order", function()
	local l = League.new(5, 1, 1, { 1, 1 })
	l.results = {
		{ { 1, 2, 2, 0 }, { 3, 4, 1, 1 }, { 5, 6, 0, 3 } },
		{ { 1, 3, 0, 0 }, { 2, 4, 3, 0 } },
	}
	local t = League.table(l)
	assert(#t == 6)
	local byClub = {}
	for _, row in t do
		byClub[row.club] = row
	end
	assert(byClub[1].points == 4 and byClub[1].gf == 2 and byClub[1].played == 2 and byClub[1].drawn == 1)
	assert(byClub[2].points == 3 and byClub[2].lost == 1)
	assert(byClub[6].points == 3 and byClub[6].gf == 3)
	-- points desc: 1 (4 pts), then 2 and 6 and ... ; 2 has GD +1, 6 has GD +3: 6 first
	assert(t[1].club == 1 and t[2].club == 6 and t[3].club == 2, t[1].club .. t[2].club .. t[3].club)
end)

test("League endSeason outcomes", function()
	local function finish(division, place)
		local l = League.new(division, 4, 9, { 1, 1 })
		-- hand-made results that put the player's club in the asked place
		l.results = {}
		for md, day in League.fixtures(6) do
			l.results[md] = {}
			for _, g in day do
				local a, b = g[1], g[2]
				-- strength order: club index decides; the player (club 1) gets the target place
				local rank = function(c)
					if c == 1 then
						return place
					end
					local r = c - 1
					return if r >= place then r + 1 else r
				end
				local hg, ag = 0, 0
				if rank(a) < rank(b) then
					hg = 1
				else
					ag = 1
				end
				l.results[md][#l.results[md] + 1] = { a, b, hg, ag }
			end
		end
		l.matchday = 6
		return League.endSeason(l, Rng.new(1))
	end
	local up = finish(5, 1)
	assert(up.outcome == "up" and up.division == 4 and up.place == 1 and up.season == 5)
	assert(finish(5, 2).outcome == "up")
	local stay = finish(5, 6)
	assert(stay.outcome == "stay" and stay.division == 5)
	local down = finish(3, 6)
	assert(down.outcome == "down" and down.division == 4)
	assert(finish(3, 4).outcome == "stay")
	local champ = finish(1, 1)
	assert(champ.outcome == "champion" and champ.division == 1)
	assert(finish(1, 2).outcome == "stay" and finish(1, 2).division == 1)
	assert(finish(1, 6).outcome == "down" and finish(1, 6).division == 2)
end)

test("League quick is deterministic with sensible goals", function()
	local a, b = Rng.new(5), Rng.new(5)
	local h1, a1 = League.quick(a, 50, 50)
	local h2, a2 = League.quick(b, 50, 50)
	assert(h1 == h2 and a1 == a2)
	local r, total = Rng.new(11), 0
	for _ = 1, 2000 do
		local h, aw = League.quick(r, 50, 50)
		total += h + aw
	end
	local mean = total / 2000
	assert(mean >= 2.0 and mean <= 3.4, tostring(mean))
end)

test("League new: player is club 1, names differ, first opponent weakest", function()
	for seed = 1, 100 do
		local l = League.new(5, 1, seed, { 3, 4 })
		assert(#l.clubs == 6 and l.matchday == 1 and l.division == 5)
		local used = { ["3-4"] = true }
		for i = 2, 6 do
			local key = l.clubs[i].place .. "-" .. l.clubs[i].suffix
			assert(not used[key], "duplicate club name " .. key)
			used[key] = true
		end
		local opp
		for _, g in League.fixtures(6)[1] do
			if g[1] == 1 then
				opp = g[2]
			elseif g[2] == 1 then
				opp = g[1]
			end
		end
		for i = 2, 6 do
			assert(l.clubs[opp].strength <= l.clubs[i].strength, "first opponent is not the weakest")
		end
	end
end)

test("League aiStrength grows with division and season", function()
	assert(League.aiStrength(1, 1) > League.aiStrength(2, 1))
	assert(League.aiStrength(5, 10) > League.aiStrength(5, 1))
	assert(League.aiStrength(5, 1000) == League.aiStrength(5, 41))
end)

test("League isOver after the last matchday", function()
	local l = League.new(5, 1, 1, { 1, 1 })
	assert(not League.isOver(l))
	l.matchday = 6
	assert(League.isOver(l))
end)
