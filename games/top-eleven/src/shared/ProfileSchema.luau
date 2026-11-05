--!strict
-- Saved player data: schema, defaults, and migrations. Pure; see tests/ProfileSchema.spec.luau.
-- Rules: migrations are idempotent and forward-only. `league` and `match` are absent until the club is founded.

local Tuning = require(script.Parent.Config.Tuning)

local ProfileSchema = {}

ProfileSchema.VERSION = 1

function ProfileSchema.default(): any
	return {
		version = ProfileSchema.VERSION,
		club = { place = 0, suffix = 0, color = 1, crest = 1, founded = 0 },
		coins = Tuning.startCoins,
		fans = Tuning.startFans,
		players = {}, -- [id] = PlayerT
		nextPlayerId = 1,
		lineup = { formation = "4-4-2", slots = {} },
		tactic = "balanced",
		nextMatchId = 1,
		training = { slots = { false } }, -- false = empty (DataStore arrays must not have holes)
		academy = { level = 1, charges = 1, nextAt = 0, prospects = {}, reports = 0 },
		facilities = { stadium = 1, training = 1, academy = 1 },
		market = { day = 0, bought = {} },
		legends = {},
		stats = {
			played = 0,
			won = 0,
			drawn = 0,
			lost = 0,
			goals = 0,
			promotions = 0,
			titles = 0,
			trainings = 0,
		},
		lastSeen = 0,
		funnel = 0,
		tips = {},
		settings = { reducedMotion = false, sound = true },
		receipts = {},
		telemetry = { firstDay = 0, source = "" },
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
