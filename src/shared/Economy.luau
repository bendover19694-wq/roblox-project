--!strict
-- All game math: trips, demand, profit, rating, career goals, offline catch-up. Pure (tested in tests/).

local Career = require(script.Parent.Config.Career)
local Destinations = require(script.Parent.Config.Destinations)
local Rockets = require(script.Parent.Config.Rockets)
local Tuning = require(script.Parent.Config.Tuning)

local Economy = {}

local function find(list: { any }, id: string): any
	for _, x in list do
		if x.id == id then
			return x
		end
	end
	return nil
end

function Economy.fare(id: string)
	return find(Tuning.fares, id)
end

function Economy.service(id: string)
	return find(Tuning.services, id)
end

function Economy.canReach(rocketId: string, destId: string): boolean
	local r, d = Rockets.byId[rocketId], Destinations.byId[destId]
	return r ~= nil and d ~= nil and d.distance <= r.range
end

function Economy.tripSeconds(rocketId: string, destId: string, fast: boolean?, speedMult: number?): number
	local r, d = Rockets.byId[rocketId], Destinations.byId[destId]
	local t = Tuning.baseTripSeconds * d.distance / r.speed
	t = math.clamp(t, Tuning.minTripSeconds, Tuning.maxTripSeconds)
	if fast then
		t /= 1.5
	end
	if speedMult then
		t /= speedMult
	end
	return math.floor(t + 0.5)
end

export type Trip = {
	filled: number,
	load: number,
	revenue: number,
	fuel: number,
	serviceCost: number,
	profit: number,
}

-- One trip's outcome. `cashMult` covers 2x Cash and server boosts (applied to positive profit only).
-- `fx` carries research effects (fuelMult, demandMult).
function Economy.trip(
	rocketId: string,
	destId: string,
	fareId: string,
	serviceId: string,
	cashMult: number?,
	fx: { fuelMult: number, demandMult: number }?
): Trip
	local r, d = Rockets.byId[rocketId], Destinations.byId[destId]
	local fare, service = Economy.fare(fareId), Economy.service(serviceId)
	local wanting = d.demand * (1 - d.competition) * fare.demandMult * service.demandMult
	if fx then
		wanting *= fx.demandMult
	end
	local filled = math.min(r.capacity, math.floor(wanting))
	local price = d.fare * fare.fareMult
	local revenue = filled * price
	local fuel = r.fuel * d.distance
	if fx then
		fuel *= fx.fuelMult
	end
	local serviceCost = filled * price * service.costShare
	local profit = math.floor(revenue - fuel - serviceCost)
	if profit > 0 and cashMult then
		profit = math.floor(profit * cashMult)
	end
	return {
		filled = filled,
		load = filled / r.capacity,
		revenue = math.floor(revenue),
		fuel = math.floor(fuel),
		serviceCost = math.floor(serviceCost),
		profit = profit,
	}
end

-- Credit cash; positive amounts also count toward lifetime earnings (career goals).
function Economy.earn(p: any, amount: number)
	p.cash += amount
	if amount > 0 then
		p.lifetimeEarned += amount
	end
end

-- Map/route tag for a destination, relative to a rocket's capacity.
function Economy.demandLabel(destId: string): string
	local d = Destinations.byId[destId]
	local open = d.demand * (1 - d.competition)
	if open >= 40 then
		return "Very high"
	elseif open >= 20 then
		return "High"
	end
	return "Medium"
end

function Economy.competitionLabel(destId: string): string
	local c = Destinations.byId[destId].competition
	return if c >= 0.25 then "High" elseif c >= 0.15 then "Medium" else "Low"
end

-- Agency rating: average service rating of active missions, nudged down by empty seats. 3.0 with none.
function Economy.rating(missions: { any }): number
	if #missions == 0 then
		return 3.0
	end
	local sum = 0
	for _, m in missions do
		local s = Economy.service(m.service)
		local load = m.lastLoad or 1
		sum += s.rating - (1 - load) * 1.0
	end
	return math.clamp(math.floor(sum / #missions * 10 + 0.5) / 10, 1, 5)
end

-- Current value of a goal for a profile.
function Economy.goalValue(p: any, goal: any): number
	local kind: string = goal.kind
	if kind == "planned" then
		return p.stats.planned
	elseif kind == "rockets" then
		return #p.rockets
	elseif kind == "earned" then
		return p.lifetimeEarned
	elseif kind == "trips" then
		return p.stats.trips
	elseif kind == "passengers" then
		return p.stats.passengers
	elseif kind == "rating" then
		return Economy.rating(p.missions)
	elseif kind == "served" then
		local seen, n = {}, 0
		for _, m in p.missions do
			if not seen[m.dest] then
				seen[m.dest] = true
				n += 1
			end
		end
		return n
	end
	local dest = kind:match("^visited:(%w+)$")
	return if dest and p.stats.visited[dest] then 1 else 0
end

-- Goals of the profile's current stage with progress. Returns stage table, list of {goal, value, done, key}.
function Economy.stageProgress(p: any)
	local stage = Career.stages[p.career.stage]
	local out = {}
	for i, goal in stage.goals do
		local value = Economy.goalValue(p, goal)
		local key = `{p.career.stage}:{i}`
		table.insert(out, {
			goal = goal,
			value = value,
			done = value >= goal.target or p.career.claimed[key] == true,
			key = key,
		})
	end
	return stage, out
end

-- How many full trips a mission completed between `from` and `to` (seconds), given its cycle.
function Economy.tripsBetween(arriveAt: number, _from: number, to: number, tripSec: number): (number, number)
	-- first arrival at or after `from` is arriveAt (if still in the future of `from`)
	if to < arriveAt then
		return 0, arriveAt
	end
	local cycle = tripSec + Tuning.turnaroundSeconds
	local n = 1 + math.floor((to - arriveAt) / cycle)
	return n, arriveAt + n * cycle
end

return Economy
