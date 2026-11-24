--!strict
-- Pure game math, shared by server (authority) and client (labels). No Roblox services.

local Config = require(script.Parent.Config)

export type Profile = {
	version: number,
	cash: number,
	clips: number,
	followers: number,
	clout: number,
	rebirths: number,
	totalClips: number,
	totalPosts: number,
	levels: { [string]: number },
	tutorialDone: boolean,
	settings: { reducedMotion: boolean, sound: boolean },
}

local Economy = {}

Economy.VERSION = 1

function Economy.default(): Profile
	return {
		version = Economy.VERSION,
		cash = 0,
		clips = 0,
		followers = 0,
		clout = 0,
		rebirths = 0,
		totalClips = 0,
		totalPosts = 0,
		levels = { clipSpeed = 0, tapPower = 0, storage = 0, editing = 0, viral = 0, autoPost = 0 },
		tutorialDone = false,
		settings = { reducedMotion = false, sound = true },
	}
end

local function num(v: any, fallback: number): number
	if type(v) == "number" and v == v and v ~= math.huge and v ~= -math.huge and v >= 0 then
		return v
	end
	return fallback
end

-- Fills missing or broken fields from defaults. Safe on nil, old or corrupt saves.
function Economy.migrate(old: any): Profile
	local p = Economy.default()
	if type(old) ~= "table" then
		return p
	end
	p.cash = num(old.cash, 0)
	p.clips = num(old.clips, 0)
	p.followers = num(old.followers, 0)
	p.clout = math.floor(num(old.clout, 0))
	p.rebirths = math.floor(num(old.rebirths, 0))
	p.totalClips = num(old.totalClips, 0)
	p.totalPosts = math.floor(num(old.totalPosts, 0))
	p.tutorialDone = old.tutorialDone == true
	if type(old.levels) == "table" then
		for id, up in Config.UPGRADES do
			p.levels[id] = math.clamp(math.floor(num(old.levels[id], 0)), 0, up.max)
		end
	end
	if type(old.settings) == "table" then
		p.settings.reducedMotion = old.settings.reducedMotion == true
		p.settings.sound = old.settings.sound ~= false
	end
	p.clips = math.min(p.clips, Economy.capacity(p))
	return p
end

function Economy.cost(id: string, level: number): number
	local up = Config.UPGRADES[id]
	return math.floor(up.base * up.growth ^ level)
end

-- nil when maxed.
function Economy.nextCost(p: Profile, id: string): number?
	local level = p.levels[id] or 0
	if level >= Config.UPGRADES[id].max then
		return nil
	end
	return Economy.cost(id, level)
end

function Economy.autoRate(p: Profile): number
	return (p.levels.clipSpeed or 0) * Config.AUTO_PER_LEVEL
end

function Economy.tapPower(p: Profile): number
	return Config.TAP_BASE + (p.levels.tapPower or 0) * Config.TAP_PER_LEVEL
end

function Economy.capacity(p: Profile): number
	return math.floor(Config.STORAGE_BASE * Config.STORAGE_GROWTH ^ (p.levels.storage or 0))
end

function Economy.viralChance(p: Profile): number
	return Config.VIRAL_BASE + (p.levels.viral or 0) * Config.VIRAL_PER_LEVEL
end

function Economy.followerBonus(followers: number): number
	return 1 + Config.FOLLOWER_BONUS * math.log10(1 + followers)
end

function Economy.cloutMult(clout: number): number
	return 1 + Config.CLOUT_MULT * clout
end

-- Highest zone index the player's followers unlock.
function Economy.unlockedZone(followers: number): number
	local best = 1
	for i, z in Config.ZONES do
		if followers >= z.followers then
			best = i
		end
	end
	return best
end

-- Zone index at a world X position (1-based), or nil off the street.
function Economy.zoneAt(x: number, z: number): number?
	if math.abs(z) > Config.ZONE_DEPTH / 2 or x < 0 then
		return nil
	end
	local i = math.floor(x / Config.ZONE_WIDTH) + 1
	return if i <= #Config.ZONES then i else nil
end

-- Hype window from a shared clock. Returns active, seconds left in the current phase.
function Economy.hype(now: number): (boolean, number)
	local t = now % Config.HYPE_PERIOD
	if t < Config.HYPE_LENGTH then
		return true, Config.HYPE_LENGTH - t
	end
	return false, Config.HYPE_PERIOD - t
end

-- Cash per clip before the viral roll.
function Economy.clipValue(p: Profile, zone: number, hypeActive: boolean): number
	local edit = 1 + (p.levels.editing or 0) * Config.EDIT_PER_LEVEL
	local zoneMult = Config.ZONES[zone].mult
	local hype = if hypeActive then Config.HYPE_MULT else 1
	return edit * zoneMult * hype * Economy.followerBonus(p.followers) * Economy.cloutMult(p.clout)
end

-- Adds clips up to capacity. Returns clips actually added.
function Economy.addClips(p: Profile, amount: number): number
	local room = math.max(0, Economy.capacity(p) - p.clips)
	local added = math.min(room, math.max(0, amount))
	p.clips += added
	p.totalClips += added
	return added
end

-- Posts every stored clip. `roll` is a number in [0, 1) from the server's Random.
-- Returns cash earned, followers gained, viral flag.
function Economy.post(p: Profile, zone: number, hypeActive: boolean, roll: number): (number, number, boolean)
	local clips = math.floor(p.clips)
	if clips <= 0 then
		return 0, 0, false
	end
	local viral = roll < Economy.viralChance(p)
	local mult = if viral then Config.VIRAL_MULT else 1
	local cash = math.floor(clips * Economy.clipValue(p, zone, hypeActive) * mult)
	-- Fractional followers carry over, so spamming 1-clip posts earns no more than one big post.
	local followers = clips * Config.FOLLOWERS_PER_CLIP * mult
	p.clips -= clips
	p.cash += cash
	p.followers += followers
	p.totalPosts += 1
	return cash, followers, viral
end

-- Buys one level. Returns ok, reason.
function Economy.buy(p: Profile, id: string): (boolean, string?)
	if not Config.UPGRADES[id] then
		return false, "Unknown upgrade"
	end
	local cost = Economy.nextCost(p, id)
	if not cost then
		return false, "Already maxed"
	end
	if p.cash < cost then
		return false, "Not enough cash"
	end
	p.cash -= cost
	p.levels[id] = (p.levels[id] or 0) + 1
	return true, nil
end

function Economy.rebirthCost(p: Profile): number
	return math.floor(Config.REBIRTH_BASE * Config.REBIRTH_GROWTH ^ p.rebirths)
end

-- Resets cash, clips and upgrades; keeps followers (zones stay open), the one-off Auto Poster, and adds 1 Clout.
function Economy.rebirth(p: Profile): (boolean, string?)
	local cost = Economy.rebirthCost(p)
	if p.cash < cost then
		return false, "Not enough cash"
	end
	p.cash = 0
	p.clips = 0
	for id in p.levels do
		if id ~= "autoPost" then
			p.levels[id] = 0
		end
	end
	p.rebirths += 1
	p.clout += 1
	return true, nil
end

return Economy
