-- Pacing simulation: a typical active player's career, many seeds. Prints a table when PACING=1 lune run tests/run.
local Economy = shared("Economy")
local Cfg = shared("Config/Economy")
local League = shared("League")
local LeagueCfg = shared("Config/League")
local Tuning = shared("Config/Tuning")
local Training = shared("Training")
local Rng = shared("Rng")

local MINUTES_PER_MATCH = 1.25 -- 40 s match plus result card and menus
local EDGE = 4 -- the player's squad is this far above its division's average (a normal, attentive manager)
local RUNS = 120

type Upgrade = { minute: number, gap: number, cost: number, level: number, season: number, division: number }

-- One career: play seasons, buy stadium upgrades as soon as affordable after a training reserve. Returns stadium upgrades.
local function career(seed: number, seasons: number)
	local r = Rng.new(seed)
	local coins, fans, level, div, minute, lastBuy = Tuning.startCoins, Tuning.startFans, 1, 5, 0, 0
	local ups: { Upgrade } = {}
	local income: { { number } } = {} -- { division, gross coins } per season
	local gross = 0
	local pointsByDiv = {}
	for season = 1, seasons do
		local base = League.aiStrength(div, season)
		local ai = { base - LeagueCfg.firstMatchGap }
		for _, off in LeagueCfg.spread do
			table.insert(ai, base + off)
		end
		local me = base + EDGE
		local pts = { 0, 0, 0, 0, 0, 0 }
		local fixtures = League.fixtures(6)
		for day = 1, 5 do
			for _, g in fixtures[day] do
				local hs = if g[1] == 1 then me else ai[g[1] - 1]
				local as = if g[2] == 1 then me else ai[g[2] - 1]
				local hg, ag = League.quick(r, hs, as)
				if hg > ag then
					pts[g[1]] += 3
				elseif hg == ag then
					pts[g[1]] += 1
					pts[g[2]] += 1
				else
					pts[g[2]] += 3
				end
				if g[1] == 1 or g[2] == 1 then
					local mine, theirs = if g[1] == 1 then hg else ag, if g[1] == 1 then ag else hg
					local res = if mine > theirs then "win" elseif mine == theirs then "draw" else "loss"
					local pay = Economy.matchReward(res, mine, div)
					if g[1] == 1 then
						pay += Economy.gate(level, fans)
					end
					coins += pay
					gross += pay
					fans += Economy.fansDelta(res, div)
					-- one training per match at the stat level a squad of this strength has
					coins -= (Training.cost(1, math.floor(me)))
					minute += MINUTES_PER_MATCH
					local cost = Economy.facilityCost("stadium", level + 1)
					if level < Tuning.facilityMax and coins >= cost then
						coins -= cost
						level += 1
						table.insert(ups, {
							minute = minute,
							gap = minute - lastBuy,
							cost = cost,
							level = level,
							season = season,
							division = div,
						})
						lastBuy = minute
					end
				end
			end
		end
		local place = 1
		for i = 2, 6 do
			if pts[i] > pts[1] then
				place += 1
			end
		end
		coins += Economy.seasonPrize(div, place)
		table.insert(income, { div, gross + Economy.seasonPrize(div, place) })
		gross = 0
		if place <= LeagueCfg.promote and div > 1 then
			div -= 1
			fans += Economy.fansPromotion()
		elseif place == 6 and div < 5 then
			div += 1
		end
		pointsByDiv[season] = div
		coins = math.max(coins, 0)
	end
	return ups, income
end

-- Mean minutes between purchases, by purchase index.
local function meanGaps(seasons: number)
	local byIdx: { { number } } = {}
	local costs = {}
	local inc: { [number]: { number } } = {}
	for run = 1, RUNS do
		local ups, income = career(run * 7919, seasons)
		for _, row in income do
			inc[row[1]] = inc[row[1]] or {}
			table.insert(inc[row[1]], row[2])
		end
		for i, u in ups do
			byIdx[i] = byIdx[i] or {}
			table.insert(byIdx[i], u.gap)
			costs[i] = u.cost
		end
	end
	local out = {}
	for i, list in byIdx do
		local sum = 0
		for _, v in list do
			sum += v
		end
		out[i] = { gap = sum / #list, n = #list, cost = costs[i] }
	end
	local seasonIncome = {}
	for d, list in inc do
		local sum = 0
		for _, v in list do
			sum += v
		end
		seasonIncome[d] = sum / #list
	end
	return out, seasonIncome
end

local gaps, seasonIncome = meanGaps(14)

test("Economy pacing: stadium upgrades 2 to 5 are reached and each takes longer than the last", function()
	if pacing then
		print("stadium level | cost | mean active minutes since previous upgrade | reached by (of runs)")
		for i = 1, 4 do
			local g = gaps[i]
			print(`  L{i + 1}  cost {g.cost}  gap {string.format("%.1f", g.gap)} min  reached {g.n}/{RUNS}`)
		end
	end
	for i = 1, 4 do
		assert(gaps[i] and gaps[i].n >= RUNS * 0.8, `stadium L{i + 1} reached by most runs`)
	end
	for i = 2, 4 do
		assert(gaps[i].gap > gaps[i - 1].gap, `upgrade {i} slower than {i - 1}`)
	end
end)

test("Economy pacing: first upgrade lands inside the Economy.targets window", function()
	local t = Cfg.targets
	for i = 1, 3 do
		local g = gaps[i].gap
		assert(
			g >= t[i].minMinutes and g <= t[i].maxMinutes,
			`upgrade {i} gap {g} outside {t[i].minMinutes}-{t[i].maxMinutes}`
		)
	end
end)

test("Economy pacing: a division-average transfer costs a fraction of a season's income", function()
	local Player = shared("Player")
	for div = 5, 3, -1 do
		local p = Player.generate(
			Rng.new(div),
			{ age = 26, pos = "MF", rarity = "common", level = Tuning.market.levelByDivision[div] }
		)
		local ratio = Economy.playerValue(p) / seasonIncome[div]
		if pacing then
			print(
				`  div {div}: season income {math.floor(seasonIncome[div])}, average transfer {Economy.playerValue(
					p
				)} ({string.format("%.2f", ratio)} seasons)`
			)
		end
		assert(ratio >= 0.2 and ratio <= 1.5, `div {div} transfer ratio {ratio}`)
	end
end)
