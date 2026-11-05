--!strict
-- Player and club names derived from seeds and indices. Names are never stored. Pure.

local Names = require(script.Parent.Config.Names)
local Rng = require(script.Parent.Rng)

local NameGen = {}

local function cap(s: string): string
	return s:sub(1, 1):upper() .. s:sub(2)
end

function NameGen.isBlocked(name: string): boolean
	local lower = name:lower()
	for _, bad in Names.blocked do
		if lower:find(bad, 1, true) then
			return true
		end
	end
	return false
end

local function build(seed: number): string
	local r = Rng.new(seed)
	local function word(list: { string }, count: number): string
		local out = ""
		for _ = 1, count do
			out ..= list[Rng.int(r, 1, #list)]
		end
		return cap(out:lower())
	end
	local first = word(Names.firstSyllables, 2)
	local last = word(Names.lastSyllables, Rng.int(r, 2, 3))
	if #last < 3 then
		last ..= "an"
	end
	return `{first} {last}`
end

function NameGen.player(nameSeed: number): string
	for i = 0, 19 do
		local name = build(nameSeed + i)
		if not NameGen.isBlocked(name) then
			return name
		end
	end
	return `{Names.firstSyllables[1]}{Names.lastSyllables[1]} {Names.lastSyllables[2]}an`
end

function NameGen.club(placeIdx: number, suffixIdx: number): string
	return `{Names.places[placeIdx]} {Names.suffixes[suffixIdx]}`
end

-- A place and suffix index for an AI club, never equal to `avoid = { place, suffix }`.
function NameGen.aiClub(seed: number, avoid: { number }?): (number, number)
	local r = Rng.new(seed)
	local place, suffix = Rng.int(r, 1, #Names.places), Rng.int(r, 1, #Names.suffixes)
	if avoid and avoid[1] == place and avoid[2] == suffix then
		suffix = suffix % #Names.suffixes + 1
	end
	return place, suffix
end

return NameGen
