local Player = shared("Player")
local Rng = shared("Rng")
local Looks = shared("Config/Looks")
local PlayersCfg = shared("Config/Players")

local function mk(pos, level, extra)
	local p =
		Player.generate(Rng.new(level * 13 + #pos), { age = 24, pos = pos, rarity = "rare", level = level })
	for k, v in extra or {} do
		(p :: any)[k] = v
	end
	return p
end

test("Player overall GK uses keeping", function()
	local p = mk("GK", 50)
	p.r = { pace = 20, shooting = 20, passing = 20, defending = 20, keeping = 80 }
	assert(Player.overall(p) >= 70, tostring(Player.overall(p)))
end)

test("Player out of position is penalised", function()
	local p = mk("FW", 60)
	p.r = { pace = 70, shooting = 70, passing = 60, defending = 20, keeping = 10 }
	assert(Player.overall(p, "GK") <= math.floor(0.75 * Player.overall(p) + 0.5))
	assert(Player.overall(p, "FW") == Player.overall(p))
end)

test("Player generate stays in bands", function()
	local r = Rng.new(3)
	local band = PlayersCfg.potential.rare
	for _ = 1, 1000 do
		local p = Player.generate(r, { age = 19, pos = "MF", rarity = "rare", level = 40 })
		assert(p.potential >= band[1] and p.potential <= band[2], p.potential)
		assert(p.age == 19 and p.pos == "MF" and p.id == "")
		for _, v in p.r do
			assert(v >= 1 and v <= p.potential, tostring(v))
		end
		assert(p.look.skin >= 1 and p.look.skin <= #Looks.skins)
		assert(p.look.hair >= 1 and p.look.hair <= #Looks.hairs)
		assert(p.look.hairColor >= 1 and p.look.hairColor <= #Looks.hairColors)
		assert(p.look.face >= 1 and p.look.face <= #Looks.faces)
	end
end)

test("Player generate lands near the asked level", function()
	local r, sum = Rng.new(8), 0
	for _ = 1, 300 do
		sum += Player.overall(Player.generate(r, { age = 25, pos = "FW", rarity = "epic", level = 60 }))
	end
	local mean = sum / 300
	assert(mean > 55 and mean < 65, tostring(mean))
end)

test("Player ageSeason declines from 31 and retires at 36", function()
	local a = mk("FW", 60, { age = 30 })
	local pace = a.r.pace
	local _, retired = Player.ageSeason(a)
	assert(a.age == 31 and a.r.pace == pace and not retired)
	local b = mk("FW", 60, { age = 31 })
	pace = b.r.pace
	Player.ageSeason(b)
	assert(b.age == 32 and b.r.pace == pace - PlayersCfg.declinePerSeason, `{pace} -> {b.r.pace}`)
	local c = mk("FW", 60, { age = 35 })
	local _, gone = Player.ageSeason(c)
	assert(gone)
end)

local function squad()
	local list, n = {}, 0
	local r = Rng.new(21)
	for pos, count in { GK = 2, DF = 5, MF = 5, FW = 4 } do
		for _ = 1, count do
			n += 1
			local p = Player.generate(r, { age = 24, pos = pos, rarity = "common", level = 45 })
			p.id = "p" .. n
			table.insert(list, p)
		end
	end
	return list
end

test("Player autoLineup gives 11 distinct ids with a keeper in slot 1", function()
	local list = squad()
	local byId = {}
	for _, p in list do
		byId[p.id] = p
	end
	for _, f in { "4-4-2", "4-3-3", "3-5-2", "5-3-2", "4-5-1" } do
		local ids = Player.autoLineup(list, f)
		assert(#ids == 11, f)
		local seen = {}
		for _, id in ids do
			assert(not seen[id] and byId[id], "dup or unknown")
			seen[id] = true
		end
		assert(byId[ids[1]].pos == "GK", f)
		assert(Player.lineupValid(byId, ids), f)
	end
end)

test("Player lineupValid rejects malformed tables", function()
	local list = squad()
	local byId = {}
	for _, p in list do
		byId[p.id] = p
	end
	local good = Player.autoLineup(list, "4-4-2")
	local function with(fn)
		local t = table.clone(good)
		fn(t)
		return t
	end
	assert(Player.lineupValid(byId, good))
	assert(not Player.lineupValid(byId, nil))
	assert(not Player.lineupValid(byId, "x"))
	assert(not Player.lineupValid(
		byId,
		with(function(t)
			t[11] = nil
		end)
	), "10 ids")
	assert(not Player.lineupValid(
		byId,
		with(function(t)
			t[12] = "p1"
		end)
	), "12 entries")
	assert(not Player.lineupValid(
		byId,
		with(function(t)
			t[11] = nil
			t[12] = "p1"
		end)
	), "hole")
	assert(not Player.lineupValid(
		byId,
		with(function(t)
			(t :: any).x = "p1"
		end)
	), "string key")
	assert(not Player.lineupValid(
		byId,
		with(function(t)
			t[2] = t[1]
		end)
	), "duplicate")
	assert(not Player.lineupValid(
		byId,
		with(function(t)
			(t :: any)[2] = 5
		end)
	), "number")
	assert(not Player.lineupValid(
		byId,
		with(function(t)
			t[2] = "p1234567x"
		end)
	), "long")
	assert(not Player.lineupValid(
		byId,
		with(function(t)
			t[2] = "zz"
		end)
	), "unknown id")
	assert(not Player.lineupValid(
		byId,
		with(function(t)
			(t :: any)[1.5] = "p1"
		end)
	), "fraction key")
end)

test("Player fillLineup keeps valid slots and fills the gaps", function()
	local list = squad()
	local byId = {}
	for _, p in list do
		byId[p.id] = p
	end
	local ids = Player.autoLineup(list, "4-4-2")
	local partial = { ids[1], "gone", ids[3] }
	local out = Player.fillLineup(byId, partial, "4-4-2", false)
	assert(#out == 11 and out[1] == ids[1] and out[3] == ids[3] and out[2] ~= "gone")
	assert(Player.lineupValid(byId, out))
	-- strict: a player whose position does not fit the slot is replaced
	local strict = Player.fillLineup(byId, ids, "4-3-3", true)
	assert(Player.lineupValid(byId, strict))
	assert(byId[strict[9]].pos == "FW")
end)
