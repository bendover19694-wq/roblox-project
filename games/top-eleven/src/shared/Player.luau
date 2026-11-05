--!strict
-- Player model: ratings, overall, generation, ageing, lineups. Pure.

local Looks = require(script.Parent.Config.Looks)
local MatchCfg = require(script.Parent.Config.Match)
local PlayersCfg = require(script.Parent.Config.Players)
local Rng = require(script.Parent.Rng)

export type Position = "GK" | "DF" | "MF" | "FW"
export type Stat = "pace" | "shooting" | "passing" | "defending" | "keeping"
export type Rarity = "common" | "rare" | "epic" | "legendary"
export type FormationId = "4-4-2" | "4-3-3" | "3-5-2" | "5-3-2" | "4-5-1"
export type PlayerT = {
	id: string,
	nameSeed: number,
	pos: Position,
	age: number,
	potential: number,
	rarity: Rarity,
	r: { pace: number, shooting: number, passing: number, defending: number, keeping: number },
	look: { skin: number, hair: number, hairColor: number, face: number },
	joined: number,
}

local Player = {}

Player.STATS = { "pace", "shooting", "passing", "defending", "keeping" }

local function clamp(v: number, lo: number, hi: number): number
	return math.max(lo, math.min(hi, v))
end

function Player.overall(p: PlayerT, pos: Position?): number
	local at = pos or p.pos
	local sum = 0
	for stat, w in PlayersCfg.weights[at] do
		sum += (p.r :: any)[stat] * w
	end
	if at ~= p.pos then
		sum *= PlayersCfg.outOfPositionMult
	end
	return clamp(math.floor(sum + 0.5), 1, 99)
end

-- `level` is the overall the player is generated around. `potentialBonus` (academy level) widens the band upwards.
function Player.generate(
	r: Rng.Rng,
	opts: {
		age: number,
		pos: Position,
		rarity: Rarity,
		level: number,
		potentialBonus: number?,
	}
): PlayerT
	local band = PlayersCfg.potential[opts.rarity]
	local potential = Rng.int(r, band[1], band[2]) + (opts.potentialBonus or 0)
	potential = clamp(math.max(potential, opts.level), 40, 99)
	local weights = PlayersCfg.weights[opts.pos]
	local ratings = {}
	for _, stat in Player.STATS do
		local v
		if weights[stat] then
			v = opts.level + Rng.int(r, -5, 5)
		else
			v = math.floor(opts.level * 0.35) + Rng.int(r, 0, 8)
		end
		ratings[stat] = clamp(v, 1, potential)
	end
	return {
		id = "",
		nameSeed = Rng.int(r, 1, 2000000000),
		pos = opts.pos,
		age = opts.age,
		potential = potential,
		rarity = opts.rarity,
		r = ratings :: any,
		look = {
			skin = Rng.int(r, 1, #Looks.skins),
			hair = Rng.int(r, 1, #Looks.hairs),
			hairColor = Rng.int(r, 1, #Looks.hairColors),
			face = Rng.int(r, 1, #Looks.faces),
		},
		joined = 0,
	}
end

-- One season older. Under 25: +1 to every rating below potential. From declineAge: pace and the position's main
-- rating drop. Returns the (mutated) player and whether they retire.
function Player.ageSeason(p: PlayerT): (PlayerT, boolean)
	local before = p.age
	p.age += 1
	local rr: any = p.r
	if before < 25 then
		for _, stat in Player.STATS do
			if rr[stat] < p.potential then
				rr[stat] += 1
			end
		end
	elseif before >= PlayersCfg.declineAge then
		local main, best = "pace", -1
		for stat, w in PlayersCfg.weights[p.pos] do
			if stat ~= "pace" and w > best then
				main, best = stat, w
			end
		end
		rr.pace = math.max(1, rr.pace - PlayersCfg.declinePerSeason)
		rr[main] = math.max(1, rr[main] - PlayersCfg.declinePerSeason)
	end
	return p, p.age >= PlayersCfg.retireAge
end

local function slotPositions(formation: string): { Position }
	return (MatchCfg.formations :: any)[formation]
end
Player.slotPositions = slotPositions

-- Fills the slots not kept. `keep(id, slotPos)` says whether an existing id may stay. Greedy: keepers, then forwards,
-- defenders, midfielders, each taking the best remaining fit.
local function fill(
	players: { [string]: PlayerT },
	slots: { string },
	formation: string,
	strict: boolean
): { string }
	local positions = slotPositions(formation)
	local out: { string } = {}
	local used: { [string]: boolean } = {}
	for i = 1, 11 do
		local id = slots[i]
		local p = if type(id) == "string" then players[id] else nil
		if p and not used[id] and (not strict or p.pos == positions[i]) then
			out[i] = id
			used[id] = true
		end
	end
	local order = { "GK", "FW", "DF", "MF" }
	for _, want in order do
		for i = 1, 11 do
			if not out[i] and positions[i] == want then
				local bestId, bestOv = nil :: string?, -1
				for id, p in players do
					if not used[id] then
						local ov = Player.overall(p, want)
						if ov > bestOv or (ov == bestOv and bestId and id < bestId) then
							bestId, bestOv = id, ov
						end
					end
				end
				if bestId then
					out[i] = bestId
					used[bestId] = true
				end
			end
		end
	end
	return out
end

function Player.fillLineup(
	players: { [string]: PlayerT },
	slots: { string },
	formation: string,
	strict: boolean
): { string }
	return fill(players, slots, formation, strict)
end

function Player.autoLineup(list: { PlayerT }, formation: FormationId): { string }
	local byId: { [string]: PlayerT } = {}
	for _, p in list do
		byId[p.id] = p
	end
	return fill(byId, {}, formation, false)
end

-- Exactly keys 1..11 (no holes, no extras), distinct owned ids of at most 8 characters.
function Player.lineupValid(players: { [string]: PlayerT }, slots: any): boolean
	if type(slots) ~= "table" then
		return false
	end
	local count = 0
	for k in slots do
		if type(k) ~= "number" or k ~= math.floor(k) or k < 1 or k > 11 then
			return false
		end
		count += 1
	end
	if count ~= 11 then
		return false
	end
	local seen: { [string]: boolean } = {}
	for i = 1, 11 do
		local id = slots[i]
		if type(id) ~= "string" or #id > 8 or seen[id] or players[id] == nil then
			return false
		end
		seen[id] = true
	end
	return true
end

return Player
