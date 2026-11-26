--!strict
-- All tuning for Clipping Empire. Change numbers here, never inline.
-- The hype game players clip is "GT6" (owner's choice, 2026-11-22). No GTA name, logos or art.

local Config = {}

Config.HYPE_GAME = "GT6"

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
	luck = {
		id = "luck",
		name = "Lucky Lens",
		blurb = "Rare clip luck",
		base = 200,
		growth = 1.5,
		max = 40,
		order = 5,
	},
	viral = {
		id = "viral",
		name = "Viral Hooks",
		blurb = "Viral chance",
		base = 150,
		growth = 1.6,
		max = 26,
		order = 6,
	},
	autoPost = {
		id = "autoPost",
		name = "Auto Poster",
		blurb = "Posts when full",
		base = 2500,
		growth = 1,
		max = 1,
		order = 7,
	},
} :: { [string]: Upgrade }

Config.UPGRADE_IDS = {
	clipSpeed = true,
	tapPower = true,
	storage = true,
	editing = true,
	luck = true,
	viral = true,
	autoPost = true,
}

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
	{ name = "Clip Studio", followers = 5000, mult = 4, color = Color3.fromRGB(120, 255, 140) },
	{ name = "Hype Plaza", followers = 60000, mult = 8, color = Color3.fromRGB(255, 196, 64) },
	{ name = "Trailer Tower", followers = 600000, mult = 16, color = Color3.fromRGB(190, 110, 255) },
} :: { Zone }
Config.ZONE_WIDTH = 90 -- studs along X per zone; zone 1 starts at X = 0
Config.ZONE_DEPTH = 70 -- studs along Z, centred on Z = 0

-- Rebirth: "Go Viral" resets cash, clips and upgrades for permanent Clout.
Config.REBIRTH_BASE = 1000000
Config.REBIRTH_GROWTH = 3
-- Cash multiplier = CLOUT_BASE ^ clout: geometric and a bit slower than the cost growth (vault:
-- Progression and Pacing Design, section 5), so each rebirth takes gently longer, never hours longer.
Config.CLOUT_BASE = 2.25

-- Trailer Drop: a server-wide hype window on a fixed clock, so its timer is always true.
Config.HYPE_PERIOD = 600 -- seconds between drops
Config.HYPE_LENGTH = 90 -- seconds a drop lasts
Config.HYPE_MULT = 3

Config.HYPE_LUCK = 2 -- luck multiplier during a Trailer Drop

-- Clip rarity. The server rolls one tier per take (a counted tap, or an auto take); see docs/rng-and-loop.md.
-- Players make about 7 takes a second, so odds are set for that rate: Epic in under a minute,
-- Legendary in the first session, Mythic as the long goal (tests/Rarity.spec.luau prints the waits).
-- oneIn = base odds (Common takes the remainder). pays = cash and follower weight per clip.
-- reveal: "float" (coloured +N), "callout", "banner", "card" (full reveal with a burst).
export type Rarity = {
	name: string,
	oneIn: number,
	pays: number,
	color: Color3,
	reveal: string,
	titles: { string },
}
Config.RARITIES = {
	{
		name = "Common",
		oneIn = 1,
		pays = 1,
		color = Color3.fromRGB(205, 200, 225),
		reveal = "float",
		titles = { "Shaky phone clip", "Trailer reaction", "Loading screen", "Menu music loop" },
	},
	{
		name = "Uncommon",
		oneIn = 4,
		pays = 1.5,
		color = Color3.fromRGB(90, 230, 120),
		reveal = "float",
		titles = { "Slow-mo car jump", "Map theory", "Neon skyline pan", "Radio station mashup" },
	},
	{
		name = "Rare",
		oneIn = 25,
		pays = 3,
		color = Color3.fromRGB(70, 170, 255),
		reveal = "callout",
		titles = { "Frame-by-frame breakdown", "Hidden easter egg", "Perfect drift", "Beach sunset drive" },
	},
	{
		name = "Epic",
		oneIn = 250,
		pays = 10,
		color = Color3.fromRGB(185, 100, 255),
		reveal = "banner",
		titles = { "Dev stream highlight", "Wild stunt fail", "Full map comparison", "Boss chase supercut" },
	},
	{
		name = "Legendary",
		oneIn = 2500,
		pays = 40,
		color = Color3.fromRGB(255, 190, 50),
		reveal = "card",
		titles = { "Launch day countdown", "Trailer 3 first look", "Studio tour exclusive" },
	},
	{
		name = "Mythic",
		oneIn = 50000,
		pays = 250,
		color = Color3.fromRGB(255, 70, 160),
		reveal = "card",
		titles = { "The release date reveal", "Gameplay premiere", "Secret ending found" },
	},
} :: { Rarity }
Config.LUCK_FROM_TIER = 3 -- luck multiplies the weight of this tier and rarer (Rare+); Common and Uncommon never vanish
Config.LUCK_CAP = 25 -- stacked luck never goes above this (tested at the cap)
Config.LUCK_PER_LEVEL = 0.1 -- Lucky Lens: luck multiplier per level
Config.CLOUT_LUCK = 0.1 -- luck multiplier per Clout
Config.ANNOUNCE_TIER = 6 -- this tier and up is announced to the whole server

Config.MAX_LEVEL_ANY = 60

return Config
