--!strict
-- League: fixtures, quick sim of the other clubs, derived table, promotion. Pure.

local Cfg = require(script.Parent.Config.League)
local Looks = require(script.Parent.Config.Looks)
local NameGen = require(script.Parent.NameGen)
local Rng = require(script.Parent.Rng)

export type AiClubT = {
	place: number,
	suffix: number,
	color: number,
	crest: number,
	strength: number,
	seed: number,
}
export type LeagueT = {
	division: number,
	season: number,
	seed: number,
	clubs: { AiClubT },
	results: { { { number } } }, -- [matchday] = { {homeIdx, awayIdx, homeGoals, awayGoals} }
	matchday: number,
}
export type RowT = {
	club: number,
	played: number,
	won: number,
	drawn: number,
	lost: number,
	gf: number,
	ga: number,
	points: number,
}

local League = {}

-- Circle method. Club 1 plays at home on odd matchdays.
function League.fixtures(clubCount: number): { { { number } } }
	local teams: { number } = {}
	for i = 1, clubCount do
		teams[i] = i
	end
	local days = {}
	for round = 1, clubCount - 1 do
		local day = {}
		for i = 1, clubCount / 2 do
			local a, b = teams[i], teams[clubCount + 1 - i]
			if i == 1 and round % 2 == 0 then
				a, b = b, a
			end
			table.insert(day, { a, b })
		end
		table.insert(days, day)
		table.insert(teams, 2, table.remove(teams) :: number)
	end
	return days
end

function League.aiStrength(division: number, season: number): number
	return Cfg.strength[division] + math.min(season - 1, Cfg.seasonGrowthCap) * Cfg.seasonGrowth
end

-- Goals for both sides from strengths (a Poisson draw each). Used for matches the player does not play.
function League.quick(r: Rng.Rng, homeStrength: number, awayStrength: number): (number, number)
	local ratio = homeStrength / math.max(1, awayStrength)
	local function poisson(lambda: number): number
		local limit, k, p = math.exp(-lambda), 0, 1
		repeat
			k += 1
			p *= Rng.next(r)
		until p <= limit or k > 12
		return k - 1
	end
	local home = poisson(Cfg.quickBase * Cfg.quickHome * ratio ^ Cfg.quickExp)
	local away = poisson(Cfg.quickBase * (1 / ratio) ^ Cfg.quickExp)
	return home, away
end

-- Club 1 is the player. AI names never repeat and never equal the player's.
function League.new(division: number, season: number, seed: number, playerPair: { number }): LeagueT
	local r = Rng.new(seed)
	local count = Cfg.clubsPerDivision
	local base = League.aiStrength(division, season)
	-- strengths: the first opponent gets the weakest, the rest are shuffled over the others
	local strengths = { base - Cfg.firstMatchGap }
	local rest = table.clone(Cfg.spread)
	for i = #rest, 2, -1 do
		local j = Rng.int(r, 1, i)
		rest[i], rest[j] = rest[j], rest[i]
	end
	for _, off in rest do
		table.insert(strengths, base + off)
	end
	local firstOpp = 0
	for _, g in League.fixtures(count)[1] do
		if g[1] == 1 then
			firstOpp = g[2]
		elseif g[2] == 1 then
			firstOpp = g[1]
		end
	end
	local clubs: { AiClubT } =
		{ { place = playerPair[1], suffix = playerPair[2], color = 1, crest = 1, strength = 0, seed = 0 } }
	local used: { [string]: boolean } = { [`{playerPair[1]}-{playerPair[2]}`] = true }
	local nextStrength = 2
	for i = 2, count do
		local clubSeed = seed * 10 + i
		local place, suffix = NameGen.aiClub(clubSeed, playerPair)
		local bump = 0
		while used[`{place}-{suffix}`] do
			bump += 1
			place, suffix = NameGen.aiClub(clubSeed + bump * 1000, playerPair)
		end
		used[`{place}-{suffix}`] = true
		local strength
		if i == firstOpp then
			strength = strengths[1]
		else
			strength = strengths[nextStrength]
			nextStrength += 1
		end
		clubs[i] = {
			place = place,
			suffix = suffix,
			color = Rng.int(r, 1, #Looks.kits),
			crest = Rng.int(r, 1, #Looks.crests),
			strength = strength,
			seed = clubSeed,
		}
	end
	return { division = division, season = season, seed = seed, clubs = clubs, results = {}, matchday = 1 }
end

function League.table(league: LeagueT): { RowT }
	local rows: { RowT } = {}
	for i = 1, #league.clubs do
		rows[i] = { club = i, played = 0, won = 0, drawn = 0, lost = 0, gf = 0, ga = 0, points = 0 }
	end
	for _, day in league.results do
		for _, g in day do
			local h, a = rows[g[1]], rows[g[2]]
			h.played += 1
			a.played += 1
			h.gf += g[3]
			h.ga += g[4]
			a.gf += g[4]
			a.ga += g[3]
			if g[3] > g[4] then
				h.won += 1
				a.lost += 1
				h.points += 3
			elseif g[3] < g[4] then
				a.won += 1
				h.lost += 1
				a.points += 3
			else
				h.drawn += 1
				a.drawn += 1
				h.points += 1
				a.points += 1
			end
		end
	end
	table.sort(rows, function(x, y)
		if x.points ~= y.points then
			return x.points > y.points
		end
		if x.gf - x.ga ~= y.gf - y.ga then
			return x.gf - x.ga > y.gf - y.ga
		end
		if x.gf ~= y.gf then
			return x.gf > y.gf
		end
		return x.club < y.club
	end)
	return rows
end

function League.isOver(league: LeagueT): boolean
	return league.matchday > #League.fixtures(#league.clubs)
end

-- Where the player finished and what happens next. `division` and `season` are the NEXT season's; `seed` seeds its league.
function League.endSeason(
	league: LeagueT,
	rng: Rng.Rng
): {
	division: number,
	place: number,
	outcome: "up" | "stay" | "down" | "champion",
	season: number,
	seed: number,
}
	local place = 1
	for i, row in League.table(league) do
		if row.club == 1 then
			place = i
		end
	end
	local div = league.division
	local outcome: "up" | "stay" | "down" | "champion" = "stay"
	if div == 1 and place == 1 then
		outcome = "champion"
	elseif place <= Cfg.promote and div > 1 then
		outcome = "up"
		div -= 1
	elseif place > #league.clubs - Cfg.relegate and div < Cfg.divisions then
		outcome = "down"
		div += 1
	end
	return {
		division = div,
		place = place,
		outcome = outcome,
		season = league.season + 1,
		seed = Rng.int(rng, 1, 2147483000),
	}
end

return League
