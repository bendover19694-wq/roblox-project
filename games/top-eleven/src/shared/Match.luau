--!strict
-- Match sim: three segments, each simulated only when its real start time has passed. Seeded and deterministic. Pure.

local Cfg = require(script.Parent.Config.Match)
local Player = require(script.Parent.Player)
local PlayersCfg = require(script.Parent.Config.Players)
local Rng = require(script.Parent.Rng)

export type TacticId = "attack" | "balanced" | "defend" | "press"
export type SideT = {
	attack: number,
	mid: number,
	defence: number,
	keeper: number,
	scorers: { { id: string, w: number } },
}
export type MomentT = {
	minute: number,
	at: number,
	kind: "goal" | "save" | "miss" | "bigChance",
	side: "home" | "away",
	playerId: string,
}
export type MatchT = {
	id: number,
	seed: number,
	matchday: number,
	homeIdx: number,
	awayIdx: number,
	home: SideT,
	away: SideT,
	startedAt: number,
	segment: number,
	tactics: { TacticId },
	pending: TacticId,
	moments: { MomentT },
	score: { number },
	final: boolean,
	rewarded: boolean,
	playerHome: boolean, -- which side the tactic belongs to (the AI always plays balanced)
	skipped: boolean, -- finish() was used: the whole match may be shown at once
}

local Match = {}

local function clamp(v: number, lo: number, hi: number): number
	return math.max(lo, math.min(hi, v))
end

-- Strengths from the eleven in slot order. Out-of-position players count at the penalty.
function Match.side(club: { [any]: Player.PlayerT }, lineup: { string }, formation: Player.FormationId): SideT
	local byId: { [string]: Player.PlayerT } = {}
	for _, p in club do
		byId[p.id] = p
	end
	local positions = Player.slotPositions(formation)
	local fw, mf, df, mfDef, attackMid =
		{ n = 0, v = 0 }, { n = 0, v = 0 }, { n = 0, v = 0 }, { n = 0, v = 0 }, { n = 0, v = 0 }
	local scorers = {}
	local keeper = 1
	for i = 1, 11 do
		local p = byId[lineup[i]]
		local pos = positions[i]
		if p then
			local mult = if p.pos == pos then 1 else PlayersCfg.outOfPositionMult
			local r: any = p.r
			if pos == "GK" then
				keeper = r.keeping * mult
			elseif pos == "FW" then
				fw.n += 1
				fw.v += (r.shooting * 0.65 + r.pace * 0.35) * mult
			elseif pos == "MF" then
				mf.n += 1
				mf.v += r.passing * mult
				attackMid.n += 1
				attackMid.v += (r.shooting * 0.4 + r.passing * 0.6) * mult
				mfDef.n += 1
				mfDef.v += r.defending * mult
			else
				df.n += 1
				df.v += (r.defending * 0.75 + r.pace * 0.25) * mult
			end
			local posFactor = ({ GK = 0.02, DF = 0.4, MF = 1.5, FW = 3 } :: any)[pos]
			table.insert(scorers, { id = p.id, w = (r.shooting * 0.7 + r.pace * 0.3) * posFactor * mult })
		end
	end
	local function avg(t: { n: number, v: number }): number
		return if t.n > 0 then t.v / t.n else 1
	end
	return {
		attack = (avg(fw) * 2 + avg(attackMid)) / 3,
		mid = avg(mf),
		defence = (avg(df) * 2.5 + avg(mfDef)) / 3.5,
		keeper = keeper,
		scorers = scorers,
	}
end

-- An AI eleven (4-4-2) generated from the seed, never saved. Ids are "ai1".."ai11".
function Match.aiSide(strength: number, seed: number): SideT
	local r = Rng.new(seed)
	local positions = Player.slotPositions("4-4-2")
	local players: { Player.PlayerT } = {}
	local ids: { string } = {}
	for i = 1, 11 do
		-- epic band so the potential cap never flattens a strong AI side
		local p = Player.generate(r, { age = 25, pos = positions[i], rarity = "epic", level = strength })
		p.id = `ai{i}`
		table.insert(players, p)
		ids[i] = p.id
	end
	return Match.side(players, ids, "4-4-2")
end

local function pickScorer(r: Rng.Rng, side: SideT): string
	local total = 0
	for _, s in side.scorers do
		total += s.w
	end
	local roll = Rng.next(r) * total
	for _, s in side.scorers do
		roll -= s.w
		if roll < 0 then
			return s.id
		end
	end
	return side.scorers[#side.scorers].id
end

local function simulate(m: MatchT, seg: number, tactic: TacticId)
	local r = Rng.new(m.seed + seg * 7919)
	m.tactics[seg] = tactic
	local playerTac = (Cfg.tactics :: any)[tactic]
	local balanced = Cfg.tactics.balanced
	local lo, hi = Cfg.segments[seg][1], Cfg.segments[seg][2]
	local segStart = m.startedAt + (seg - 1) * Cfg.segmentSeconds
	local made: { MomentT } = {}
	for _, which in { "home", "away" } do
		local me: SideT = (m :: any)[which]
		local foe: SideT = (m :: any)[if which == "home" then "away" else "home"]
		local isPlayer = (which == "home") == m.playerHome
		local mine = if isPlayer then playerTac else balanced
		local theirs = if isPlayer then balanced else playerTac
		local pc = Cfg.chanceBase * (me.mid / foe.mid) ^ Cfg.midExp * playerTac.chances
		if which == "home" then
			pc *= Cfg.homeBoost
		end
		pc = clamp(pc, 0.05, 0.95)
		for _ = 1, Cfg.trials do
			if Rng.next(r) < pc then
				local minute = Rng.int(r, lo, hi)
				local who = pickScorer(r, me)
				local att = me.attack * mine.attack
				local pGoal = Cfg.goalBase
					* (att / (foe.defence * theirs.defence)) ^ Cfg.goalExp
					* (att / foe.keeper) ^ Cfg.keeperExp
				pGoal = clamp(pGoal, 0.03, 0.8)
				local kind: "goal" | "save" | "miss" | "bigChance"
				if Rng.next(r) < pGoal then
					kind = "goal"
				else
					local pSave = clamp(Cfg.saveShare * (foe.keeper / att) ^ 0.5, 0.2, 0.85)
					if Rng.next(r) < pSave then
						kind = "save"
					elseif Rng.next(r) < Cfg.bigChanceShare then
						kind = "bigChance"
					else
						kind = "miss"
					end
				end
				table.insert(made, {
					minute = minute,
					at = segStart + (minute - lo) / (hi - lo + 1) * Cfg.segmentSeconds,
					kind = kind,
					side = which :: "home" | "away",
					playerId = who,
				})
			end
		end
	end
	-- table.sort is not stable, but only moments in the same minute can swap, and `at` comes from the minute
	table.sort(made, function(a, b)
		return a.minute < b.minute
	end)
	for _, mo in made do
		table.insert(m.moments, mo)
		if mo.kind == "goal" then
			m.score[if mo.side == "home" then 1 else 2] += 1
		end
	end
	m.segment = seg
	if seg == #Cfg.segments then
		m.final = true
	end
end

function Match.kickoff(
	seed: number,
	home: SideT,
	away: SideT,
	tactic: TacticId,
	now: number,
	playerHome: boolean?
): MatchT
	local m: MatchT = {
		id = 0,
		seed = seed,
		matchday = 0,
		homeIdx = 0,
		awayIdx = 0,
		home = home,
		away = away,
		startedAt = now,
		segment = 0,
		tactics = {},
		pending = tactic,
		moments = {},
		score = { 0, 0 },
		final = false,
		rewarded = false,
		playerHome = playerHome ~= false,
		skipped = false,
	}
	simulate(m, 1, tactic)
	return m
end

function Match.isFinal(m: MatchT): boolean
	return m.final
end

-- Simulates every segment whose start time has passed, with the tactic pending at that time. True if anything changed.
function Match.advance(m: MatchT, now: number): boolean
	local changed = false
	while m.segment < #Cfg.segments and now >= m.startedAt + m.segment * Cfg.segmentSeconds do
		simulate(m, m.segment + 1, m.pending)
		changed = true
	end
	return changed
end

function Match.setTactic(m: MatchT, tactic: TacticId, now: number): boolean
	Match.advance(m, now) -- a late change never rewrites a segment that already started
	if m.final then
		return false
	end
	m.pending = tactic
	return true
end

-- Skip: resolves the rest at once with the pending tactic.
function Match.finish(m: MatchT, _now: number)
	while m.segment < #Cfg.segments do
		simulate(m, m.segment + 1, m.pending)
	end
	m.skipped = true
end

-- Fully played out (or skipped): safe to reward and to show the final score.
function Match.isDone(m: MatchT, now: number): boolean
	return m.final and (m.skipped or now >= m.startedAt + #Cfg.segments * Cfg.segmentSeconds)
end

-- What the client may see: moments whose real time has come (everything after a skip).
function Match.visible(m: MatchT, now: number): { MomentT }
	local out: { MomentT } = {}
	for _, mo in m.moments do
		if m.skipped or mo.at <= now then
			table.insert(out, mo)
		end
	end
	return out
end

return Match
