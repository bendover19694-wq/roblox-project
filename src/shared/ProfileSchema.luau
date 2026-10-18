--!strict
-- Saved player data: schema, defaults, and migrations. Pure; see tests/ProfileSchema.spec.luau.
-- Rules: migrations are idempotent and forward-only.

local Tuning = require(script.Parent.Config.Tuning)

local ProfileSchema = {}

ProfileSchema.VERSION = 1

function ProfileSchema.default(): any
	return {
		version = ProfileSchema.VERSION,
		agency = { name = "", color = 1 },
		cash = Tuning.startCash,
		lifetimeEarned = 0,
		rockets = {}, -- { id, model, tail, mission?, trips, earned }
		missions = {}, -- { id, dest, rocket, fare, service, departAt, arriveAt, trips, earned, lastProfit, lastLoad }
		nextRocket = 1,
		nextMission = 1,
		stats = { planned = 0, trips = 0, passengers = 0, visited = {} },
		career = { stage = 1, claimed = {} },
		daily = { lastDay = 0, streak = 0 },
		lastSeen = 0,
		tips = {},
		funnel = 0,
		settings = { reducedMotion = false },
		receipts = {},
	}
end

local migrations: { (any) -> any } = {
	function(data)
		return data
	end,
}

local function fill(target: any, defaults: any)
	for k, v in defaults do
		if target[k] == nil then
			target[k] = v
		elseif type(v) == "table" and type(target[k]) == "table" and next(v) ~= nil then
			fill(target[k], v)
		end
	end
end

function ProfileSchema.migrate(data: any): any
	if type(data) ~= "table" then
		return ProfileSchema.default()
	end
	local version = if type(data.version) == "number" then data.version else 0
	for v = version + 1, ProfileSchema.VERSION do
		data = migrations[v](data)
	end
	fill(data, ProfileSchema.default())
	data.version = ProfileSchema.VERSION
	return data
end

return ProfileSchema
