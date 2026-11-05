local Actions = shared("Actions")
local Settle = shared("Settle")
local ProfileSchema = shared("ProfileSchema")
local NextMove = shared("NextMove")
local View = shared("View")
local Player = shared("Player")
local League = shared("League")
local Rng = shared("Rng")
local Match = shared("Match")
local Tuning = shared("Config/Tuning")
local Names = shared("Config/Names")

local gen = Rng.new(2024)
local clock = 1000
local function ctx()
	return {
		now = clock,
		day = 20000,
		userId = 77,
		randomInt = function(lo, hi)
			return Rng.int(gen, lo, hi)
		end,
	}
end

local function act(p, name, ...)
	local ok, msg, events = Actions.run(p, name, table.pack(...), ctx())
	return ok, msg, events
end

local function dump(v)
	if type(v) ~= "table" then
		return tostring(v)
	end
	local keys = {}
	for k in v do
		table.insert(keys, k)
	end
	table.sort(keys, function(a, b)
		return tostring(a) < tostring(b)
	end)
	local out = {}
	for _, k in keys do
		table.insert(out, tostring(k) .. "=" .. dump(v[k]))
	end
	return "{" .. table.concat(out, ",") .. "}"
end

local function newClub()
	clock = 1000
	local p = ProfileSchema.default()
	assert(act(p, "createClub", 1, 1, 1, 1))
	return p
end

local function count(t)
	local n = 0
	for _ in t do
		n += 1
	end
	return n
end

-- plays one full match the way MatchService does and returns the result
local function playOut(p)
	assert(act(p, "playMatch"))
	clock += 40
	local r = Settle.run(p, clock)
	assert(r, "match did not settle")
	return r
end

test("createClub builds the club, squad, lineup and league", function()
	local p = newClub()
	assert(
		p.club.place == 1
			and count(p.players) == Tuning.squad.start
			and p.nextPlayerId == Tuning.squad.start + 1
	)
	assert(Player.lineupValid(p.players, p.lineup.slots))
	assert(
		p.league.division == 5 and p.league.season == 1 and p.league.matchday == 1 and #p.league.clubs == 6
	)
	assert(NextMove.of(p, clock) == "playMatch" or NextMove.of(p, clock) == "scout")
	assert(not act(p, "createClub", 2, 2, 2, 2), "second club")
end)

test("createClub rejects bad arguments with no change", function()
	local bad = {
		{},
		{ nil, 1, 1, 1 },
		{ 0, 1, 1, 1 },
		{ 1, 99, 1, 1 },
		{ 1, 1, 99, 1 },
		{ 1, 1, 1, 99 },
		{ 1.5, 1, 1, 1 },
		{ 1e309, 1, 1, 1 },
		{ "x", 1, 1, 1 },
		{ -1, 1, 1, 1 },
		{ 0 / 0, 1, 1, 1 },
		{ {}, 1, 1, 1 },
		{ true, 1, 1, 1 },
	}
	for i, args in bad do
		local p = ProfileSchema.default()
		local before = dump(p)
		args.n = 4
		local ok = Actions.run(p, "createClub", args, ctx())
		assert(not ok, "accepted bad args #" .. i)
		assert(dump(p) == before, "state changed by bad args #" .. i)
	end
	assert(#Names.places >= 1)
end)

test("actions need a club, unknown actions fail", function()
	local p = ProfileSchema.default()
	assert(not act(p, "scout"))
	assert(not act(p, "playMatch"))
	assert(not act(p, "nope"))
	assert(not act(p, 5 :: any))
	assert(not act(p, string.rep("x", 40)))
end)

test("hostile arguments never change state or error", function()
	local hostile = { 1e309, -1e309, 0 / 0, string.rep("x", 40), {}, true, 0, -1, 99999, 1.5, "p1" }
	for _, name in
		{
			"setFormation",
			"setLineup",
			"setTactic",
			"startTraining",
			"claimTraining",
			"promote",
			"release",
			"buyPlayer",
			"sellPlayer",
			"upgradeFacility",
			"setFlag",
			"seenTip",
		}
	do
		for _, h in hostile do
			local p = newClub()
			local before = dump(p)
			local ok = pcall(function()
				Actions.run(p, name, table.pack(h, h, h), ctx())
			end)
			assert(ok, name .. " errored on " .. tostring(h))
			assert(
				dump(p) == before or name == "sellPlayer" or name == "buyPlayer",
				name .. " changed state on " .. tostring(h)
			)
		end
	end
end)

test("setLineup rejects malformed tables and accepts a valid swap", function()
	local p = newClub()
	local good = table.clone(p.lineup.slots)
	local before = dump(p)
	local function try(mut)
		local t = table.clone(good)
		mut(t)
		local ok = act(p, "setLineup", t)
		assert(not ok)
		assert(dump(p) == before)
	end
	try(function(t)
		t[11] = nil
	end)
	try(function(t)
		t[12] = "p1"
	end)
	try(function(t)
		t[2] = t[1]
	end)
	try(function(t)
		t.x = "p1"
	end)
	try(function(t)
		t[3] = 5
	end)
	try(function(t)
		t[3] = "p123456789"
	end)
	try(function(t)
		t[3] = "zzz"
	end)
	assert(not act(p, "setLineup", "no"))
	assert(not act(p, "setLineup"))
	local swapped = table.clone(good)
	swapped[2], swapped[3] = good[3], good[2]
	assert(act(p, "setLineup", swapped))
	assert(p.lineup.slots[2] == good[3])
end)

test("setFormation refits only the slots that no longer match", function()
	local p = newClub()
	assert(act(p, "setFormation", "4-3-3"))
	assert(p.lineup.formation == "4-3-3" and Player.lineupValid(p.players, p.lineup.slots))
	assert(p.players[p.lineup.slots[9]].pos == "FW")
	assert(not act(p, "setFormation", "9-9-9"))
end)

test("a played match pays once, settles on later calls, and keeps the league moving", function()
	local p = newClub()
	local coins0 = p.coins
	assert(act(p, "playMatch"))
	assert(not act(p, "playMatch"), "second kickoff while live")
	assert(Settle.run(p, clock + 5) == nil, "settled before the end")
	clock += 40
	local r = Settle.run(p, clock)
	assert(r and r.coins > 0 and p.coins == coins0 + r.coins)
	assert(Settle.run(p, clock + 100) == nil, "paid twice")
	assert(p.coins == coins0 + r.coins)
	assert(p.league.matchday == 2 and #p.league.results[1] == 3)
	assert(p.stats.played == 1 and p.stats.won + p.stats.drawn + p.stats.lost == 1)
	assert(p.match.rewarded)
end)

test("a match left mid-way settles later with the last tactic", function()
	local p = newClub()
	assert(act(p, "playMatch"))
	assert(act(p, "setTactic", "attack"))
	local r = Settle.run(p, clock + 100000)
	assert(r)
	assert(p.match.tactics[2] == "attack" and p.match.tactics[3] == "attack")
end)

test("setTactic before a match changes the next kickoff", function()
	local p = newClub()
	assert(act(p, "setTactic", "defend") and p.tactic == "defend")
	assert(act(p, "playMatch"))
	assert(p.match.tactics[1] == "defend")
	assert(not act(p, "setTactic", "dribble"))
end)

test("skip needs a first match and never speeds up play", function()
	local p = newClub()
	assert(act(p, "playMatch"))
	assert(not act(p, "skipMatch"), "skip before the first match")
	clock += 40
	assert(Settle.run(p, clock))
	assert(act(p, "playMatch"))
	local started = p.match.startedAt
	local ok, _, events = act(p, "skipMatch")
	assert(ok and p.match.rewarded and events and events[1].kind == "fullTime")
	local coins = p.coins
	assert(not act(p, "skipMatch"), "skip twice")
	assert(not act(p, "playMatch"), "replay straight after skip")
	clock = started + 38
	assert(not act(p, "playMatch"))
	clock = started + 39
	assert(act(p, "playMatch"))
	assert(p.coins == coins)
end)

test("a full season, promotion and the next season run clean", function()
	local p = newClub()
	assert(act(p, "scout")) -- the next-move order puts a ready report before the season
	for _ = 1, 5 do
		playOut(p)
	end
	assert(League.isOver(p.league) and NextMove.of(p, clock) == "nextSeason")
	assert(not act(newClub(), "nextSeason"), "season not over")
	local coins = p.coins
	local ok, _, events = act(p, "nextSeason")
	assert(ok and events and events[1].kind == "season")
	assert(p.coins > coins and p.league.season == 2 and p.league.matchday == 1)
	assert(Player.lineupValid(p.players, p.lineup.slots))
	assert(count(p.players) >= Tuning.squad.minAfterSeason)
end)

test("many seasons keep the save healthy", function()
	local p = newClub()
	for season = 1, 12 do
		for _ = 1, 5 do
			playOut(p)
			-- spend a little like a player would
			act(p, "scout")
			clock += 20000
		end
		assert(act(p, "nextSeason"), "season " .. season)
		assert(count(p.players) >= Tuning.squad.minAfterSeason and count(p.players) <= Tuning.squad.max + 2)
		assert(Player.lineupValid(p.players, p.lineup.slots), "lineup after season " .. season)
		assert(p.league.division >= 1 and p.league.division <= 5)
		assert(#p.legends <= Tuning.legendsMax)
	end
	assert(p.stats.played == 60)
end)

test("retirements are topped up to the minimum squad", function()
	local p = newClub()
	local old = 0
	for _, pl in p.players do
		if old < 3 then
			pl.age = 35
			old += 1
		end
	end
	for _ = 1, 5 do
		playOut(p)
	end
	-- drop the squad to 14 so that three retirements need a top-up
	local ids = {}
	for id in p.players do
		table.insert(ids, id)
	end
	table.sort(ids)
	for _, id in ids do
		if count(p.players) > 14 and p.players[id].age ~= 35 and not table.find(p.lineup.slots, id) then
			p.players[id] = nil
		end
	end
	assert(count(p.players) == 14, tostring(count(p.players)))
	assert(act(p, "nextSeason"))
	assert(count(p.players) == Tuning.squad.minAfterSeason, tostring(count(p.players)))
	assert(#p.legends == 3)
	assert(Player.lineupValid(p.players, p.lineup.slots))
end)

test("selling at the edges", function()
	local p = newClub()
	-- training player cannot be sold
	local benchId
	for id in p.players do
		if not table.find(p.lineup.slots, id) then
			benchId = id
			break
		end
	end
	p.players[benchId].potential = 90
	assert(act(p, "startTraining", 1, benchId, "pace"))
	assert(not act(p, "sellPlayer", benchId), "sold a player in training")
	assert(not act(p, "sellPlayer", "nobody"))
	-- a starter can be sold outside a match and the lineup refills
	local starter = p.lineup.slots[5]
	local coins = p.coins
	assert(act(p, "sellPlayer", starter))
	assert(p.coins > coins and p.players[starter] == nil)
	assert(Player.lineupValid(p.players, p.lineup.slots))
	-- a starter in a live match cannot be sold
	assert(act(p, "playMatch"))
	assert(not act(p, "sellPlayer", p.lineup.slots[6]))
	clock += 40
	Settle.run(p, clock)
	-- the squad never drops below eleven
	local ids = {}
	for id in p.players do
		table.insert(ids, id)
	end
	table.sort(ids)
	for _, id in ids do
		if count(p.players) > 11 then
			p.players[id] = nil
		end
	end
	p.lineup.slots = Player.fillLineup(p.players, {}, "4-4-2", false)
	p.training.slots[1] = false
	local last = p.lineup.slots[3]
	assert(not act(p, "sellPlayer", last), "sold the 11th player")
	assert(count(p.players) == 11)
end)

test("full squads block promote and buy", function()
	local p = newClub()
	p.coins = 10 ^ 9
	assert(act(p, "scout"))
	assert(#p.academy.prospects == 1)
	while count(p.players) < Tuning.squad.max do
		p.players["x" .. count(p.players)] =
			Player.generate(gen, { age = 22, pos = "MF", rarity = "common", level = 40 })
		p.players["x" .. (count(p.players) - 1)].id = "x" .. (count(p.players) - 1)
	end
	assert(not act(p, "promote", 1), "promoted into a full squad")
	assert(not act(p, "buyPlayer", 1), "bought into a full squad")
	assert(#p.academy.prospects == 1)
	assert(act(p, "release", 1) and #p.academy.prospects == 0)
end)

test("scout is truthful: first report rare, charges and timers", function()
	local p = newClub()
	assert(p.academy.charges == 1)
	local ok, _, events = act(p, "scout")
	assert(ok and p.academy.prospects[1].rarity == "rare" and events[1].kind == "scout")
	assert(p.academy.charges == 0 and p.academy.nextAt == clock + 14400)
	assert(not act(p, "scout"), "scouted with no charge")
	clock += 14400
	assert(act(p, "scout"))
	assert(act(p, "promote", 1) and p.players["p17"] and p.players["p17"].id == "p17")
end)

test("market day boundary resets the bought list", function()
	local p = newClub()
	p.coins = 10 ^ 9
	assert(act(p, "buyPlayer", 2))
	assert(not act(p, "buyPlayer", 2), "bought the same slot twice")
	assert(p.market.day == 20000 and p.market.bought[1] == 2)
	assert(not act(p, "buyPlayer", 7) and not act(p, "buyPlayer", 0))
	local c = ctx()
	c.day = 20001
	assert(Actions.run(p, "buyPlayer", table.pack(2), c), "new day should reopen the slot")
	assert(p.market.day == 20001 and #p.market.bought == 1)
end)

test("training: start, wait, claim", function()
	local p = newClub()
	local id = p.lineup.slots[10]
	p.players[id].potential = 90
	local from = p.players[id].r.shooting
	local coins = p.coins
	assert(act(p, "startTraining", 1, id, "shooting"))
	assert(
		p.coins < coins and p.training.slots[1].endsAt == clock + Tuning.training.firstSeconds,
		"first training is short"
	)
	assert(not act(p, "claimTraining", 1), "claimed early")
	clock += Tuning.training.firstSeconds
	local ok, _, events = act(p, "claimTraining", 1)
	assert(
		ok
			and events[1].kind == "trained"
			and p.players[id].r.shooting > from
			and p.training.slots[1] == false
	)
	assert(not act(p, "claimTraining", 1))
	assert(not act(p, "startTraining", 2, id, "shooting"), "slot beyond level")
	p.coins = 10 ^ 6
	assert(act(p, "startTraining", 1, id, "pace"))
	assert(p.training.slots[1].endsAt - clock > Tuning.training.firstSeconds, "later timers are longer")
end)

test("facilities cost coins and level up", function()
	local p = newClub()
	p.coins = 0
	assert(not act(p, "upgradeFacility", "stadium"), "no coins")
	p.coins = 10 ^ 9
	assert(act(p, "upgradeFacility", "stadium") and p.facilities.stadium == 2)
	assert(act(p, "upgradeFacility", "training") and #p.training.slots == 2)
	assert(act(p, "upgradeFacility", "academy") and p.academy.level == 2)
	for _ = 1, 10 do
		act(p, "upgradeFacility", "stadium")
	end
	assert(p.facilities.stadium == Tuning.facilityMax)
	assert(not act(p, "upgradeFacility", "pitch"))
end)

test("settings and tips", function()
	local p = newClub()
	assert(act(p, "setFlag", "sound", false) and p.settings.sound == false)
	assert(not act(p, "setFlag", "coins", true) and not act(p, "setFlag", "sound", "yes"))
	assert(act(p, "seenTip", "lineup") and p.tips.lineup == true)
	assert(not act(p, "seenTip", "../etc"))
end)

test("view never leaks seeds, sides or future moments", function()
	local p = newClub()
	assert(act(p, "playMatch"))
	local v = View.of(p, { now = clock + 1, serverNow = clock + 1, canSave = true, day = 20000, userId = 77 })
	local function scan(t, path)
		for k, x in t do
			assert(
				k ~= "seed" and k ~= "nameSeed" and k ~= "home" and k ~= "away",
				"leaked " .. path .. "." .. tostring(k)
			)
			if type(x) == "table" then
				scan(x, path .. "." .. tostring(k))
			end
		end
	end
	scan(v, "view")
	assert(v.match and v.match.id and v.match.final == false and v.match.homeIdx and v.match.awayIdx)
	for _, mo in v.match.moments do
		assert(mo.at <= clock + 1, "future moment")
		assert(type(mo.name) == "string")
	end
	-- score so far only counts visible goals
	local goals = 0
	for _, mo in v.match.moments do
		if mo.kind == "goal" then
			goals += 1
		end
	end
	assert(v.match.score[1] + v.match.score[2] == goals)
	assert(v.clubName == Names.places[1] .. " " .. Names.suffixes[1] and #v.players == Tuning.squad.start)
	assert(#v.league.table == 6 and v.nextMove and #v.market.list == Tuning.market.size)
end)

test("catch-up pays offline gate once, capped, and settles a finished match", function()
	local p = newClub()
	p.lastSeen = clock
	assert(act(p, "playMatch"))
	local coins = p.coins
	local summary = Settle.catchUp(p, clock + 99 * 3600)
	assert(summary and summary.coins > 0 and summary.matchFinished and p.match.rewarded)
	assert(p.coins == coins + summary.coins + summary.matchFinished.coins)
	assert(summary.scoutCharges >= 1)
	assert(Settle.catchUp(p, clock + 99 * 3600) == nil, "second catch-up at the same time")
	local fresh = ProfileSchema.default()
	assert(Settle.catchUp(fresh, clock) == nil)
	local q = newClub()
	q.lastSeen = clock - 5
	assert(Settle.catchUp(q, clock) == nil, "tiny absence")
end)

test("match kickoff uses the weakest opponent first", function()
	local p = newClub()
	assert(act(p, "playMatch"))
	local m = p.match
	local opp = if m.homeIdx == 1 then m.awayIdx else m.homeIdx
	for i = 2, 6 do
		assert(p.league.clubs[opp].strength <= p.league.clubs[i].strength)
	end
	assert(Match.isDone(m, clock + 39) == m.final)
end)
