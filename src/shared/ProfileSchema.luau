--!strict
-- Saved player data: schema, defaults, and migrations. Pure; see tests/ProfileSchema.spec.luau.
-- Rules: migrations are idempotent and forward-only.

local Tuning = require(script.Parent.Config.Tuning)

local ProfileSchema = {}

ProfileSchema.VERSION = 2

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
		research = { engines = 0, efficiency = 0, comfort = 0 }, -- upgrade levels
		contracts = { day = 0, list = {} }, -- today's contracts, see Contracts.luau
		gifts = { day = 0, played = 0, next = 1 }, -- playtime gifts, see Gifts.luau
		settings = { reducedMotion = false, sound = true },
		receipts = {},
	}
end

local migrations: { (any) -> any } = {
	function(data)
		return data
	end,
	-- v2 only adds research, contracts, gifts and settings.sound; `fill` below supplies them with defaults.
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
