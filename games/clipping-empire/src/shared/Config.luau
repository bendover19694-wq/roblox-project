--!strict
-- All tuning for Clipping Empire. Change numbers here, never inline.
-- The hype game players clip is the fictional "Heist City 6" (no real game names or art).

local Config = {}

Config.HYPE_GAME = "HEIST CITY 6"

-- Taps arrive batched from the client. The server caps how many count.
Config.TAP_BATCH_MAX = 20 -- most taps one batch may claim
Config.TAP_PER_SECOND_CAP = 12 -- human ceiling; extra taps are dropped
Config.AUTO_TICK = 0.5 -- seconds between auto-clip ticks

-- Upgrades. cost(level) = base * growth ^ level. `per` is the gain per level.
export type Upgrade = {
	id: string,
	name: string,
	blurb: string,
	base: number,
	growth: number,
	max: number,
	order: number,
}

Config.UPGRADES = {
	clipSpeed = {
		id = "clipSpeed",
		name = "Clip Speed",
		blurb = "Auto clips",
		base = 25,
		growth = 1.32,
		max = 60,
		order = 2,
	},
	tapPower = {
		id = "tapPower",
		name = "Tap Power",
		blurb = "Clips per tap",
		base = 10,
		growth = 1.3,
		max = 60,
		order = 1,
	},
	storage = {
		id = "storage",
		name = "Hard Drive",
		blurb = "Drive space",
		base = 40,
		growth = 1.38,
		max = 50,
		order = 3,
	},
	editing = {
		id = "editing",
		name = "Editing Skill",
		blurb = "Cash per clip",
		base = 60,
		growth = 1.42,
		max = 50,
		order = 4,
	},
	viral = {
		id = "viral",
		name = "Viral Hooks",
		blurb = "Viral chance",
		base = 150,
		growth = 1.6,
		max = 26,
		order = 5,
	},
	autoPost = {
		id = "autoPost",
		name = "Auto Poster",
		blurb = "Posts when full",
		base = 2500,
		growth = 1,
		max = 1,
		order = 6,
	},
} :: { [string]: Upgrade }

Config.UPGRADE_IDS =
	{ clipSpeed = true, tapPower = true, storage = true, editing = true, viral = true, autoPost = true }

-- Stat curves, by upgrade level.
Config.AUTO_PER_LEVEL = 0.6 -- auto clips/sec per Clip Speed level
Config.TAP_BASE = 1
Config.TAP_PER_LEVEL = 1
Config.STORAGE_BASE = 25
Config.STORAGE_GROWTH = 1.35 -- capacity = base * growth ^ level
Config.EDIT_PER_LEVEL = 0.25 -- cash multiplier per Editing level
Config.VIRAL_BASE = 0.03
Config.VIRAL_PER_LEVEL = 0.005
Config.VIRAL_MULT = 5 -- a viral post pays this many times over
Config.FOLLOWERS_PER_CLIP = 0.2
Config.FOLLOWER_BONUS = 0.25 -- cash multiplier: 1 + FOLLOWER_BONUS * log10(1 + followers)

-- Setups along the street. Followers are a requirement, never spent.
export type Zone = { name: string, followers: number, mult: number, color: Color3 }
Config.ZONES = {
	{ name = "Bedroom Setup", followers = 0, mult = 1, color = Color3.fromRGB(255, 92, 168) },
	{ name = "Gamer Cafe", followers = 300, mult = 2, color = Color3.fromRGB(64, 196, 255) },
	{ name = "Clip Studio", followers = 4000, mult = 4, color = Color3.fromRGB(120, 255, 140) },
	{ name = "Hype Plaza", followers = 40000, mult = 8, color = Color3.fromRGB(255, 196, 64) },
	{ name = "Trailer Tower", followers = 400000, mult = 16, color = Color3.fromRGB(190, 110, 255) },
} :: { Zone }
Config.ZONE_WIDTH = 90 -- studs along X per zone; zone 1 starts at X = 0
Config.ZONE_DEPTH = 70 -- studs along Z, centred on Z = 0

-- Rebirth: "Go Viral" resets cash, clips and upgrades for permanent Clout.
Config.REBIRTH_BASE = 150000
Config.REBIRTH_GROWTH = 4
Config.CLOUT_MULT = 0.5 -- cash multiplier per Clout: 1 + CLOUT_MULT * clout

-- Trailer Drop: a server-wide hype window on a fixed clock, so its timer is always true.
Config.HYPE_PERIOD = 600 -- seconds between drops
Config.HYPE_LENGTH = 90 -- seconds a drop lasts
Config.HYPE_MULT = 3

Config.MAX_LEVEL_ANY = 60

return Config
