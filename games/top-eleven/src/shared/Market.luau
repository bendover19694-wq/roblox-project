--!strict
-- Daily transfer list. Deterministic from (userId, day); not a gamble. Pure.

local Player = require(script.Parent.Player)
local Rng = require(script.Parent.Rng)
local Tuning = require(script.Parent.Config.Tuning)

local Market = {}

local POSITIONS = { GK = 1, DF = 3, MF = 3, FW = 3 }
local RARITIES = { common = 60, rare = 28, epic = 10, legendary = 2 }

-- Ids are "m1".."m6" (the list index); buying copies the player in under a new id.
function Market.daily(userId: number, day: number, division: number): { Player.PlayerT }
	local r = Rng.new(userId * 100003 + day)
	local base = Tuning.market.levelByDivision[division]
	local list: { Player.PlayerT } = {}
	for i = 1, Tuning.market.size do
		local p = Player.generate(r, {
			age = Rng.int(r, 19, 32),
			pos = Rng.pick(r, POSITIONS) :: Player.Position,
			rarity = Rng.pick(r, RARITIES) :: Player.Rarity,
			level = base + Rng.int(r, -8, 8),
		})
		p.id = `m{i}`
		list[i] = p
	end
	return list
end

return Market
