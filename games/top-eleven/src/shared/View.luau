--!strict
-- The State view sent to the client. Pure. It never contains a seed, an unplayed moment, or either match side:
-- Match.luau is replicated, so a leaked seed would let an exploiter pre-run the next segment under every tactic.

local Academy = require(script.Parent.Academy)
local AcademyCfg = require(script.Parent.Config.Academy)
local Economy = require(script.Parent.Economy)
local League = require(script.Parent.League)
local Market = require(script.Parent.Market)
local Match = require(script.Parent.Match)
local NameGen = require(script.Parent.NameGen)
local NextMove = require(script.Parent.NextMove)
local Player = require(script.Parent.Player)
local Training = require(script.Parent.Training)
local Tuning = require(script.Parent.Config.Tuning)

local View = {}

function View.card(pl: Player.PlayerT): any
	return {
		id = pl.id,
		name = NameGen.player(pl.nameSeed),
		pos = pl.pos,
		age = pl.age,
		potential = pl.potential,
		rarity = pl.rarity,
		r = table.clone(pl.r),
		look = table.clone(pl.look),
		joined = pl.joined,
		overall = Player.overall(pl),
	}
end

local function idNumber(id: string): number
	return tonumber(id:match("%d+")) or 0
end

local function matchView(p: any, now: number): any
	local m: Match.MatchT? = p.match
	if not m then
		return nil
	end
	local lg: League.LeagueT = p.league
	local oppIdx = if m.playerHome then m.awayIdx else m.homeIdx
	local oppSeed = lg.clubs[oppIdx].seed
	local moments = {}
	local score = { 0, 0 }
	for _, mo in Match.visible(m, now) do
		local name = "Unknown"
		local aiSlot = mo.playerId:match("^ai(%d+)$")
		if aiSlot then
			name = NameGen.player(oppSeed * 31 + (tonumber(aiSlot) or 0))
		elseif p.players[mo.playerId] then
			name = NameGen.player(p.players[mo.playerId].nameSeed)
		end
		table.insert(moments, {
			minute = mo.minute,
			at = mo.at,
			kind = mo.kind,
			side = mo.side,
			playerId = mo.playerId,
			name = name,
		})
		if mo.kind == "goal" then
			score[if mo.side == "home" then 1 else 2] += 1
		end
	end
	return {
		id = m.id,
		matchday = m.matchday,
		homeIdx = m.homeIdx,
		awayIdx = m.awayIdx,
		startedAt = m.startedAt,
		segment = m.segment,
		tactics = table.clone(m.tactics),
		pending = m.pending,
		score = score,
		final = Match.isDone(m, now),
		rewarded = m.rewarded,
		moments = moments,
	}
end

local function leagueView(p: any): any
	local lg: League.LeagueT = p.league
	local names = {}
	for i, c in lg.clubs do
		names[i] = NameGen.club(c.place, c.suffix)
	end
	local rows = {}
	for rank, row in League.table(lg) do
		local out = table.clone(row) :: any
		out.rank = rank
		out.name = names[row.club]
		out.isPlayer = row.club == 1
		table.insert(rows, out)
	end
	local fixtures = {}
	for md, day in League.fixtures(#lg.clubs) do
		for _, g in day do
			if g[1] == 1 or g[2] == 1 then
				local played = lg.results[md]
				local score = nil
				if played then
					for _, r in played do
						if r[1] == g[1] and r[2] == g[2] then
							score = { r[3], r[4] }
						end
					end
				end
				table.insert(fixtures, { matchday = md, homeIdx = g[1], awayIdx = g[2], score = score })
			end
		end
	end
	return {
		division = lg.division,
		season = lg.season,
		matchday = lg.matchday,
		matchdays = #League.fixtures(#lg.clubs),
		over = League.isOver(lg),
		names = names,
		table = rows,
		fixtures = fixtures,
	}
end

-- o: { now, canSave, day, userId }
function View.of(p: any, o: { now: number, canSave: boolean?, day: number, userId: number }): any
	local now = o.now
	local view: any = {
		serverNow = now,
		canSave = o.canSave ~= false,
		club = p.club,
		coins = p.coins,
		fans = p.fans,
		settings = p.settings,
		tips = p.tips,
		stats = p.stats,
		nextMove = NextMove.of(p, now),
		funnel = p.funnel,
	}
	if p.club.place == 0 then
		return view
	end
	view.clubName = NameGen.club(p.club.place, p.club.suffix)

	local ids = {}
	for id in p.players do
		table.insert(ids, id)
	end
	table.sort(ids, function(a, b)
		return idNumber(a) < idNumber(b)
	end)
	local players = {}
	for _, id in ids do
		table.insert(players, View.card(p.players[id]))
	end
	view.players = players
	view.squad = { count = #ids, max = Tuning.squad.max }
	view.lineup = { formation = p.lineup.formation, slots = table.clone(p.lineup.slots) }
	view.tactic = p.tactic
	view.league = leagueView(p)
	view.match = matchView(p, now)

	local slots = {}
	for i = 1, Training.slots(p.facilities.training) do
		local s = p.training.slots[i]
		slots[i] = if s then { playerId = s.playerId, stat = s.stat, endsAt = s.endsAt } else false
	end
	view.training =
		{ slots = slots, firstSeconds = Tuning.training.firstSeconds, gain = Tuning.training.gain }

	local a = p.academy
	local prospects = {}
	for i, pr in a.prospects do
		prospects[i] = View.card(pr)
	end
	local level = p.facilities.academy
	view.academy = {
		level = level,
		charges = Academy.available(a, now),
		maxCharges = AcademyCfg.maxCharges,
		nextAt = a.nextAt,
		rechargeSeconds = AcademyCfg.rechargeSeconds,
		odds = Academy.odds(level),
		prospects = prospects,
		maxProspects = AcademyCfg.maxProspects,
		firstFree = a.reports == 0,
	}

	local list = {}
	local boughtToday: { [number]: boolean } = {}
	if p.market.day == o.day then
		for _, i in p.market.bought do
			boughtToday[i] = true
		end
	end
	for i, pl in Market.daily(o.userId, o.day, p.league.division) do
		local card = View.card(pl)
		card.price = Economy.playerValue(pl)
		card.index = i
		card.bought = boughtToday[i] == true
		list[i] = card
	end
	view.market = { day = o.day, list = list }

	local facilities = {}
	for _, f in { "stadium", "training", "academy" } do
		local lv = p.facilities[f]
		facilities[f] = {
			level = lv,
			max = Tuning.facilityMax,
			nextCost = if lv < Tuning.facilityMax then Economy.facilityCost(f :: any, lv + 1) else nil,
		}
	end
	view.facilities = facilities
	view.gate = Economy.gate(p.facilities.stadium, p.fans)

	local legends = {}
	for i, l in p.legends do
		legends[i] = { name = NameGen.player(l.nameSeed), pos = l.pos, best = l.best }
	end
	view.legends = legends
	return view
end

return View
