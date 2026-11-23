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
	drive: { number }, -- clips stored per rarity tier; sums to `clips`
	found: { number }, -- takes found per rarity tier, ever
	best: number, -- rarest tier ever found (0 = none yet)
	tutorialDone: boolean,
	settings: { reducedMotion: boolean, sound: boolean },
}

local Economy = {}

Economy.VERSION = 2

local TIERS = #Config.RARITIES

local function zeros(): { number }
	return table.create(TIERS, 0)
end

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
		levels = { clipSpeed = 0, tapPower = 0, storage = 0, editing = 0, luck = 0, viral = 0, autoPost = 0 },
		drive = zeros(),
		found = zeros(),
		best = 0,
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
	-- The drive must sum to `clips`; anything else (v1 saves, corruption) becomes all Common.
	local drive, sum = zeros(), 0
	if type(old.drive) == "table" then
		for i = 1, TIERS do
			drive[i] = num(old.drive[i], 0)
			sum += drive[i]
		end
	end
	if math.abs(sum - p.clips) > 1e-6 then
		drive = zeros()
		drive[1] = p.clips
	end
	p.drive = drive
	if type(old.found) == "table" then
		for i = 1, TIERS do
			p.found[i] = math.floor(num(old.found[i], 0))
		end
	end
	p.best = math.clamp(math.floor(num(old.best, 0)), 0, TIERS)
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

-- Luck multiplies every non-Common tier's odds. Upgrades and Clout raise it; a Trailer Drop doubles it.
function Economy.luck(p: Profile, hypeActive: boolean): number
	local lens = 1 + (p.levels.luck or 0) * Config.LUCK_PER_LEVEL
	local clout = 1 + p.clout * Config.CLOUT_LUCK
	return lens * clout * (if hypeActive then Config.HYPE_LUCK else 1)
end

-- Chance of each tier at this luck. From the top tier down, tier i takes min(1, luck / oneIn) of
-- what is left; Common gets the remainder. Always sums to 1.
function Economy.odds(luck: number): { number }
	local odds = zeros()
	local left = 1
	for i = TIERS, 2, -1 do
		local p = left * math.min(1, luck / Config.RARITIES[i].oneIn)
		odds[i] = p
		left -= p
	end
	odds[1] = left
	return odds
end

-- Maps a uniform roll u in [0, 1) to a tier, rarest first.
function Economy.rollTier(luck: number, u: number): number
	local odds = Economy.odds(luck)
	local acc = 0
	for i = TIERS, 2, -1 do
		acc += odds[i]
		if u < acc then
			return i
		end
	end
	return 1
end

-- Sum of stored clips weighted by their tier's payout.
function Economy.driveWorth(p: Profile): number
	local worth = 0
	for i, n in p.drive do
		worth += n * Config.RARITIES[i].pays
	end
	return worth
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

-- Adds clips of one tier (default Common) up to capacity. Returns clips actually added.
function Economy.addClips(p: Profile, amount: number, tier: number?): number
	local room = math.max(0, Economy.capacity(p) - p.clips)
	local added = math.min(room, math.max(0, amount))
	local t = tier or 1
	p.clips += added
	p.drive[t] += added
	p.totalClips += added
	return added
end

-- One take: clips of a rolled tier. Records it in the collection when anything was stored.
-- Returns clips added and whether this tier is new to the player.
function Economy.take(p: Profile, amount: number, tier: number): (number, boolean)
	local added = Economy.addClips(p, amount, tier)
	if added <= 0 then
		return 0, false
	end
	local isNew = p.found[tier] == 0
	p.found[tier] += 1
	p.best = math.max(p.best, tier)
	return added, isNew
end

-- Posts every stored clip, fractions included. `roll` is a number in [0, 1) from the server's Random.
-- Returns cash earned, followers gained, viral flag.
function Economy.post(p: Profile, zone: number, hypeActive: boolean, roll: number): (number, number, boolean)
	if p.clips < 1 then
		return 0, 0, false
	end
	local worth = Economy.driveWorth(p) -- each clip weighted by its rarity
	local viral = roll < Economy.viralChance(p)
	local mult = if viral then Config.VIRAL_MULT else 1
	local cash = math.floor(worth * Economy.clipValue(p, zone, hypeActive) * mult)
	-- Fractional followers carry over, so spamming 1-clip posts earns no more than one big post.
	local followers = worth * Config.FOLLOWERS_PER_CLIP * mult
	p.clips = 0
	p.drive = zeros()
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
	p.drive = zeros()
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
