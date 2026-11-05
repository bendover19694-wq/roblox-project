--!strict
-- Full-time settlement and offline catch-up. Pure; MatchService calls it every second and on join.
-- A match pays exactly once: `match.rewarded` is saved with the profile.

local Economy = require(script.Parent.Economy)
local League = require(script.Parent.League)
local Match = require(script.Parent.Match)
local Academy = require(script.Parent.Academy)
local Rng = require(script.Parent.Rng)
local Tuning = require(script.Parent.Config.Tuning)

export type MatchResultT = {
	matchday: number,
	opponent: number,
	home: boolean,
	score: { number },
	result: "win" | "draw" | "loss",
	coins: number,
	fans: number,
}

local Settle = {}

-- Advances the match; if it is over and not yet rewarded, credits coins and fans, stores the matchday's results
-- (the other clubs are quick-simmed), and returns the result once.
function Settle.run(p: any, now: number): MatchResultT?
	local m: Match.MatchT? = p.match
	if not m or m.rewarded then
		return nil
	end
	Match.advance(m, now)
	if not Match.isDone(m, now) then
		return nil
	end
	local lg: League.LeagueT = p.league
	local home = m.homeIdx == 1
	local mine, theirs = m.score[if home then 1 else 2], m.score[if home then 2 else 1]
	local result: "win" | "draw" | "loss" = if mine > theirs
		then "win"
		elseif mine == theirs then "draw"
		else "loss"
	local coins = Economy.matchReward(result, mine, lg.division)
	if home then
		coins += Economy.gate(p.facilities.stadium, p.fans)
	end
	local fans = Economy.fansDelta(result, lg.division)
	p.coins += coins
	p.fans += fans
	p.stats.played += 1
	p.stats.goals += mine
	if result == "win" then
		p.stats.won += 1
	elseif result == "draw" then
		p.stats.drawn += 1
	else
		p.stats.lost += 1
	end
	if lg.results[m.matchday] == nil then
		local day = { { m.homeIdx, m.awayIdx, m.score[1], m.score[2] } }
		local r = Rng.new(lg.seed + m.matchday)
		for _, g in League.fixtures(#lg.clubs)[m.matchday] do
			if g[1] ~= 1 and g[2] ~= 1 then
				local hg, ag = League.quick(r, lg.clubs[g[1]].strength, lg.clubs[g[2]].strength)
				table.insert(day, { g[1], g[2], hg, ag })
			end
		end
		lg.results[m.matchday] = day
		lg.matchday = math.max(lg.matchday, m.matchday + 1)
	end
	m.rewarded = true
	return {
		matchday = m.matchday,
		opponent = if home then m.awayIdx else m.homeIdx,
		home = home,
		score = { m.score[1], m.score[2] },
		result = result,
		coins = coins,
		fans = fans,
	}
end

export type Summary = {
	seconds: number,
	coins: number,
	trainingReady: number,
	scoutCharges: number,
	matchFinished: MatchResultT?,
}

-- On join: settle a match that finished while away, pay the capped offline gate, report what happened.
function Settle.catchUp(p: any, now: number): Summary?
	if p.club.place == 0 then
		return nil
	end
	local finished = Settle.run(p, now)
	local seconds = if p.lastSeen > 0 then math.max(0, now - p.lastSeen) else 0
	p.lastSeen = now
	if seconds < Tuning.offlineMinSeconds and not finished then
		return nil
	end
	local coins = 0
	if seconds >= Tuning.offlineMinSeconds then
		coins = Economy.offline(p.facilities.stadium, p.fans, seconds)
		p.coins += coins
	end
	Academy.recharge(p.academy, now)
	local ready = 0
	for _, s in p.training.slots do
		if s and now >= s.endsAt then
			ready += 1
		end
	end
	return {
		seconds = seconds,
		coins = coins,
		trainingReady = ready,
		scoutCharges = p.academy.charges,
		matchFinished = finished,
	}
end

return Settle
