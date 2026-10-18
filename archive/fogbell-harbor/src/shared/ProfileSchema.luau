--!strict
-- Saved player data: schema, defaults, and migrations. Pure; see tests/ProfileSchema.spec.luau.
-- Rules: migrations are idempotent and forward-only; never delete a field a live server may still read.

local ProfileSchema = {}

ProfileSchema.VERSION = 1

export type Profile = {
	version: number,
	coins: number,
	xp: number,
	logbook: { [string]: number }, -- entry id -> first-seen unix time
	cosmetics: { owned: { [string]: boolean }, equipped: { [string]: string } },
	settings: { reducedMotion: boolean },
	stats: { nights: number, correct: number, mimicsStopped: number },
	firstNightDay: number, -- UTC day number of the last first-night-of-day bonus
	tips: { [string]: boolean },
	funnel: number,
}

function ProfileSchema.default(): Profile
	return {
		version = ProfileSchema.VERSION,
		coins = 0,
		xp = 0,
		logbook = {},
		cosmetics = { owned = {}, equipped = {} },
		settings = { reducedMotion = false },
		stats = { nights = 0, correct = 0, mimicsStopped = 0 },
		firstNightDay = 0,
		tips = {},
		funnel = 0,
	}
end

-- migrations[n] upgrades version n-1 data to version n.
local migrations: { (any) -> any } = {
	-- v1: initial schema; fills any missing fields from defaults.
	function(data)
		return data
	end,
}

local function fill(target: any, defaults: any)
	for k, v in defaults do
		if target[k] == nil then
			target[k] = if type(v) == "table" then table.clone(v) else v
		elseif type(v) == "table" and type(target[k]) == "table" then
			fill(target[k], v)
		end
	end
end

function ProfileSchema.migrate(data: any): Profile
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
