--!strict
-- Every client action, validated and applied to a profile. Pure: time and randomness come in through `ctx`, so the
-- whole rule set runs under Lune. ClubService only adds the remote, the rate limit, saving and pushing.
-- Order inside each handler: validate the arguments, then the game rules, then change state.

local Academy = require(script.Parent.Academy)
local AcademyCfg = require(script.Parent.Config.Academy)
local Economy = require(script.Parent.Economy)
local League = require(script.Parent.League)
local Looks = require(script.Parent.Config.Looks)
local Market = require(script.Parent.Market)
local Match = require(script.Parent.Match)
local MatchCfg = require(script.Parent.Config.Match)
local Names = require(script.Parent.Config.Names)
local Net = require(script.Parent.Net)
local Player = require(script.Parent.Player)
local Rng = require(script.Parent.Rng)
local Settle = require(script.Parent.Settle)
local Training = require(script.Parent.Training)
local Tuning = require(script.Parent.Config.Tuning)
local View = require(script.Parent.View)

export type Ctx = { now: number, day: number, userId: number, randomInt: (lo: number, hi: number) -> number }
export type Event = { kind: string, data: any }
type Args = { n: number, [number]: any }

local Actions = {}

local FORMATIONS: { [string]: boolean } = {}
for id in MatchCfg.formations :: { [string]: any } do
	FORMATIONS[id] = true
end
local TACTICS: { [string]: boolean } = {}
for id in MatchCfg.tactics :: { [string]: any } do
	TACTICS[id] = true
end
local STATS: { [string]: boolean } =
	{ pace = true, shooting = true, passing = true, defending = true, keeping = true }
local FACILITIES: { [string]: boolean } = { stadium = true, training = true, academy = true }
local FLAGS: { [string]: boolean } = { reducedMotion = true, sound = true }
local TIPS: { [string]: boolean } = {
	welcome = true,
	lineup = true,
	match = true,
	scout = true,
	training = true,
	market = true,
	season = true,
}
local RANDOM_MAX = 2147483646
local MAX_ARGS = 8

local function isId(v: any): boolean
	return type(v) == "string" and #v >= 1 and #v <= 8
end

local function live(p: any): boolean
	return p.match ~= nil and not p.match.rewarded
end

local function squadCount(p: any): number
	local n = 0
	for _ in p.players do
		n += 1
	end
	return n
end

local function addPlayer(p: any, pl: Player.PlayerT): string
	local id = `p{p.nextPlayerId}`
	p.nextPlayerId += 1
	pl.id = id
	pl.joined = if p.league then p.league.season else 1
	p.players[id] = pl
	return id
end

local function refill(p: any, strict: boolean)
	p.lineup.slots = Player.fillLineup(p.players, p.lineup.slots, p.lineup.formation, strict)
end

local function setSlot(p: any, slot: number, value: any)
	for i = #p.training.slots + 1, slot - 1 do
		p.training.slots[i] = false
	end
	p.training.slots[slot] = value
end

type Handler = (p: any, a: Args, ctx: Ctx, events: { Event }) -> (boolean, string?)

local handlers: { [string]: Handler } = {}

handlers.createClub = function(p, a, ctx)
	if p.club.place ~= 0 then
		return false, "You already have a club"
	end
	if
		not (
			Net.isInt(a[1], 1, #Names.places)
			and Net.isInt(a[2], 1, #Names.suffixes)
			and Net.isInt(a[3], 1, #Looks.kits)
			and Net.isInt(a[4], 1, #Looks.crests)
		)
	then
		return false, "Pick a name, colour and crest"
	end
	local r = Rng.new(ctx.randomInt(1, RANDOM_MAX))
	p.club = { place = a[1], suffix = a[2], color = a[3], crest = a[4], founded = math.floor(ctx.now) }
	local wanted: { [string]: number } = { GK = 2, DF = 5, MF = 5, FW = 4 }
	for pos, count in wanted do
		for _ = 1, count do
			addPlayer(
				p,
				Player.generate(r, {
					age = Rng.int(r, 18, 30),
					pos = pos :: Player.Position,
					rarity = "common",
					level = Tuning.startLevel,
				})
			)
		end
	end
	p.league = League.new(5, 1, Rng.int(r, 1, RANDOM_MAX), { a[1], a[2] })
	p.lineup = { formation = "4-4-2", slots = {} }
	refill(p, false)
	p.academy.nextAt = ctx.now + AcademyCfg.rechargeSeconds -- the one free charge is held; the next one is on the clock
	return true
end

handlers.setFormation = function(p, a)
	if not Net.isEnum(a[1], FORMATIONS) then
		return false, "Pick a formation"
	end
	if live(p) then
		return false, "Wait for full time"
	end
	p.lineup.formation = a[1]
	refill(p, true)
	return true
end

handlers.setLineup = function(p, a)
	if not Player.lineupValid(p.players, a[1]) then
		return false, "That lineup does not work"
	end
	if live(p) then
		return false, "Wait for full time"
	end
	local slots = {}
	for i = 1, 11 do
		slots[i] = a[1][i]
	end
	p.lineup.slots = slots
	return true
end

handlers.setTactic = function(p, a, ctx)
	if not Net.isEnum(a[1], TACTICS) then
		return false, "Pick a tactic"
	end
	p.tactic = a[1]
	if live(p) then
		Match.setTactic(p.match, a[1], ctx.now) -- false after the last segment started: it applies to the next match
	end
	return true
end

handlers.playMatch = function(p, _a, ctx)
	if live(p) then
		return false, "A match is on"
	end
	local lg: League.LeagueT = p.league
	if League.isOver(lg) then
		return false, "The season is over"
	end
	local fullTime = #MatchCfg.segments * MatchCfg.segmentSeconds
	if p.match and ctx.now < p.match.startedAt + fullTime then
		return false, "Wait for the next kickoff" -- skipping shows the result early but never makes matches faster
	end
	if not Player.lineupValid(p.players, p.lineup.slots) then
		return false, "Fix your lineup first"
	end
	local md = lg.matchday
	local homeIdx, awayIdx = 0, 0
	for _, g in League.fixtures(#lg.clubs)[md] do
		if g[1] == 1 or g[2] == 1 then
			homeIdx, awayIdx = g[1], g[2]
		end
	end
	local oppIdx = if homeIdx == 1 then awayIdx else homeIdx
	local mine = Match.side(p.players, p.lineup.slots, p.lineup.formation :: Player.FormationId)
	local theirs = Match.aiSide(lg.clubs[oppIdx].strength, lg.clubs[oppIdx].seed + md)
	local home, away = if homeIdx == 1 then mine else theirs, if homeIdx == 1 then theirs else mine
	local m = Match.kickoff(ctx.randomInt(1, RANDOM_MAX), home, away, p.tactic, ctx.now, homeIdx == 1)
	m.id = p.nextMatchId
	p.nextMatchId += 1
	m.matchday, m.homeIdx, m.awayIdx = md, homeIdx, awayIdx
	p.match = m
	return true
end

handlers.skipMatch = function(p, _a, ctx, events)
	if not live(p) then
		return false, "No match is on"
	end
	if p.stats.played < 1 then
		return false, "Watch your first match"
	end
	Match.finish(p.match, ctx.now)
	local result = Settle.run(p, ctx.now)
	if result then
		table.insert(events, { kind = "fullTime", data = result })
	end
	return true
end

handlers.nextSeason = function(p, _a, ctx, events)
	local lg: League.LeagueT = p.league
	if not League.isOver(lg) or live(p) then
		return false, "The season is not over"
	end
	local r = Rng.new(ctx.randomInt(1, RANDOM_MAX))
	local info = League.endSeason(lg, r)
	local prize = Economy.seasonPrize(lg.division, info.place)
	p.coins += prize
	if info.outcome == "up" or info.outcome == "champion" then
		p.fans += Economy.fansPromotion()
		p.stats.promotions += 1
	end
	if info.outcome == "champion" then
		p.stats.titles += 1
	end

	-- age the squad in id order so the result never depends on table iteration order
	local ids = {}
	for id in p.players do
		table.insert(ids, id)
	end
	table.sort(ids)
	for _, id in ids do
		local pl = p.players[id]
		local _, retired = Player.ageSeason(pl)
		if retired then
			table.insert(p.legends, { nameSeed = pl.nameSeed, pos = pl.pos, best = Player.overall(pl) })
			if #p.legends > Tuning.legendsMax then
				table.remove(p.legends, 1)
			end
			p.players[id] = nil
			for i, s in p.training.slots do
				if s and s.playerId == id then
					p.training.slots[i] = false
				end
			end
		end
	end
	-- free youngsters so retirements can never leave a squad too small to play
	local target = { GK = 2, DF = 5, MF = 5, FW = 4 }
	while squadCount(p) < Tuning.squad.minAfterSeason do
		local have = { GK = 0, DF = 0, MF = 0, FW = 0 }
		for _, pl in p.players do
			have[pl.pos] += 1
		end
		local pos, gap = "MF", -99
		for _, want in { "GK", "DF", "MF", "FW" } do
			if target[want] - have[want] > gap then
				pos, gap = want, target[want] - have[want]
			end
		end
		addPlayer(
			p,
			Player.generate(r, { age = 17, pos = pos :: Player.Position, rarity = "common", level = 30 })
		)
	end

	p.league = League.new(info.division, info.season, info.seed, { p.club.place, p.club.suffix })
	refill(p, false)
	table.insert(events, {
		kind = "season",
		data = { division = info.division, place = info.place, outcome = info.outcome, prize = prize },
	})
	return true
end

handlers.startTraining = function(p, a, ctx)
	local slotCount = Training.slots(p.facilities.training)
	if not (Net.isInt(a[1], 1, slotCount) and isId(a[2]) and Net.isEnum(a[3], STATS)) then
		return false, "Pick a slot, a player and a rating"
	end
	local slot, id, stat = a[1] :: number, a[2] :: string, a[3] :: Player.Stat
	local ok, why = Training.check(p, slot, id, stat :: any)
	if not ok then
		return false, why
	end
	local coins, seconds = Training.cost(p.facilities.training, p.players[id].r[stat])
	if p.stats.trainings == 0 then
		seconds = Tuning.training.firstSeconds
	end
	p.coins -= coins
	p.stats.trainings += 1
	setSlot(p, slot, { playerId = id, stat = stat, endsAt = ctx.now + seconds })
	return true
end

handlers.claimTraining = function(p, a, ctx, events)
	if not Net.isInt(a[1], 1, Training.slots(p.facilities.training)) then
		return false, "No such slot"
	end
	local s = p.training.slots[a[1]]
	if not s then
		return false, "Nothing is training there"
	end
	if ctx.now < s.endsAt then
		return false, "Still training"
	end
	local pl = p.players[s.playerId]
	if pl then
		local from = pl.r[s.stat]
		Training.apply(pl, s.stat, Tuning.training.gain)
		table.insert(
			events,
			{ kind = "trained", data = { playerId = pl.id, stat = s.stat, from = from, to = pl.r[s.stat] } }
		)
	end
	p.training.slots[a[1]] = false
	return true
end

handlers.scout = function(p, _a, ctx, events)
	local acad = p.academy
	Academy.recharge(acad, ctx.now)
	if acad.charges < 1 then
		return false, "No report ready yet"
	end
	if #acad.prospects >= AcademyCfg.maxProspects then
		return false, "Your academy is full"
	end
	local r = Rng.new(ctx.randomInt(1, RANDOM_MAX))
	local prospect = Academy.roll(r, p.facilities.academy, acad.reports == 0)
	Academy.spend(acad, ctx.now)
	acad.reports += 1
	table.insert(acad.prospects, prospect)
	table.insert(events, { kind = "scout", data = { player = View.card(prospect) } })
	return true
end

handlers.promote = function(p, a)
	local list = p.academy.prospects
	if not Net.isInt(a[1], 1, #list) then
		return false, "Pick a prospect"
	end
	if squadCount(p) >= Tuning.squad.max then
		return false, "Your squad is full"
	end
	addPlayer(p, table.remove(list, a[1]) :: any)
	return true
end

handlers.release = function(p, a)
	if not Net.isInt(a[1], 1, #p.academy.prospects) then
		return false, "Pick a prospect"
	end
	table.remove(p.academy.prospects, a[1])
	return true
end

handlers.buyPlayer = function(p, a, ctx)
	if p.market.day ~= ctx.day then
		p.market = { day = ctx.day, bought = {} }
	end
	if not Net.isInt(a[1], 1, Tuning.market.size) then
		return false, "Pick a player"
	end
	if table.find(p.market.bought, a[1]) then
		return false, "Already signed today"
	end
	if squadCount(p) >= Tuning.squad.max then
		return false, "Your squad is full"
	end
	local pl = Market.daily(ctx.userId, ctx.day, p.league.division)[a[1]]
	local price = Economy.playerValue(pl)
	if p.coins < price then
		return false, "Not enough coins"
	end
	p.coins -= price
	table.insert(p.market.bought, a[1])
	addPlayer(p, pl)
	return true
end

handlers.sellPlayer = function(p, a)
	if not isId(a[1]) or not p.players[a[1]] then
		return false, "Pick a player"
	end
	local id: string = a[1]
	if live(p) and table.find(p.lineup.slots, id) then
		return false, "He is playing right now"
	end
	if squadCount(p) <= 11 then
		return false, "You need eleven players"
	end
	for _, s in p.training.slots do
		if s and s.playerId == id then
			return false, "He is training"
		end
	end
	p.coins += math.floor(Economy.playerValue(p.players[id]) * Tuning.market.sellRate)
	p.players[id] = nil
	local at = table.find(p.lineup.slots, id)
	if at then
		p.lineup.slots[at] = ""
		refill(p, false)
	end
	return true
end

handlers.upgradeFacility = function(p, a, _ctx, events)
	if not Net.isEnum(a[1], FACILITIES) then
		return false, "Pick a facility"
	end
	local f: Economy.FacilityId = a[1]
	local level = p.facilities[f]
	if level >= Tuning.facilityMax then
		return false, "Already at the top"
	end
	local cost = Economy.facilityCost(f, level + 1)
	if p.coins < cost then
		return false, "Not enough coins"
	end
	p.coins -= cost
	p.facilities[f] = level + 1
	table.insert(events, { kind = "upgrade", data = { facility = f, level = level + 1 } })
	if f == "academy" then
		p.academy.level = level + 1
	elseif f == "training" then
		setSlot(p, Training.slots(level + 1), p.training.slots[Training.slots(level + 1)] or false)
	end
	return true
end

handlers.setFlag = function(p, a)
	if not Net.isEnum(a[1], FLAGS) or type(a[2]) ~= "boolean" then
		return false, "Not a setting"
	end
	p.settings[a[1]] = a[2]
	return true
end

handlers.seenTip = function(p, a)
	if not Net.isEnum(a[1], TIPS) then
		return false, "Not a tip"
	end
	p.tips[a[1]] = true
	return true
end

local NO_CLUB_NEEDED: { [string]: boolean } = { createClub = true, setFlag = true, seenTip = true }

-- Returns ok, a short player-facing message, and events for ClubService to turn into Celebrate calls.
function Actions.run(p: any, action: any, args: Args, ctx: Ctx): (boolean, string?, { Event }?)
	if type(action) ~= "string" or #action > Net.MAX_STRING then
		return false, "Unknown action"
	end
	local handler = handlers[action]
	if not handler then
		return false, "Unknown action"
	end
	if args.n > MAX_ARGS then
		return false, "Too many arguments"
	end
	for i = 1, args.n do
		local v = args[i]
		if type(v) == "string" and #v > Net.MAX_STRING then
			return false, "Too long"
		end
	end
	if p.club.place == 0 and not NO_CLUB_NEEDED[action] then
		return false, "Found your club first"
	end
	local events: { Event } = {}
	local ok, message = handler(p, args, ctx, events)
	return ok, message, if ok then events else nil
end

return Actions
