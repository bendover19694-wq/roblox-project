--!strict
-- Scouting: shown odds, truthful recharge, rolls. Pure.

local Cfg = require(script.Parent.Config.Academy)
local Player = require(script.Parent.Player)
local Rng = require(script.Parent.Rng)

export type AcademyT = {
	level: number,
	charges: number,
	nextAt: number,
	prospects: { Player.PlayerT },
	reports: number,
}

local Academy = {}

function Academy.odds(level: number): { [Player.Rarity]: number }
	return table.clone(Cfg.odds[level])
end

-- Adds a charge for every whole period passed; the remainder is kept in nextAt. At the cap the clock stops.
function Academy.recharge(a: AcademyT, now: number)
	if a.charges >= Cfg.maxCharges then
		a.charges = Cfg.maxCharges
		a.nextAt = 0
		return
	end
	if a.nextAt == 0 then
		a.nextAt = now + Cfg.rechargeSeconds
		return
	end
	if now >= a.nextAt then
		local periods = math.floor((now - a.nextAt) / Cfg.rechargeSeconds) + 1
		local add = math.min(periods, Cfg.maxCharges - a.charges)
		a.charges += add
		a.nextAt += periods * Cfg.rechargeSeconds
		if a.charges >= Cfg.maxCharges then
			a.nextAt = 0
		end
	end
end

-- Charges ready at `now`, without changing anything.
function Academy.available(a: AcademyT, now: number): number
	if a.charges >= Cfg.maxCharges or a.nextAt == 0 or now < a.nextAt then
		return a.charges
	end
	return math.min(Cfg.maxCharges, a.charges + math.floor((now - a.nextAt) / Cfg.rechargeSeconds) + 1)
end

-- Uses one charge (call recharge first). Spending from the cap, or with the clock stopped, starts the clock now.
function Academy.spend(a: AcademyT, now: number): boolean
	if a.charges < 1 then
		return false
	end
	if a.charges >= Cfg.maxCharges or a.nextAt == 0 then
		a.nextAt = now + Cfg.rechargeSeconds
	end
	a.charges -= 1
	return true
end

function Academy.roll(r: Rng.Rng, level: number, firstEver: boolean): Player.PlayerT
	local rarity: Player.Rarity = if firstEver
		then "rare"
		else Rng.pick(r, Cfg.odds[level] :: { [string]: number }) :: any
	local pos: Player.Position = Rng.pick(r, Cfg.positionWeights :: { [string]: number }) :: any
	local p = Player.generate(r, {
		age = Rng.int(r, 16, 18),
		pos = pos,
		rarity = rarity,
		level = 25,
		potentialBonus = Cfg.potentialBonus[level],
	})
	-- youngsters start well below their potential
	local start = math.floor(p.potential * 0.5)
	local rr: any = p.r
	for stat, v in rr do
		rr[stat] = math.max(1, math.min(v, start + Rng.int(r, -3, 3)))
	end
	return p
end

return Academy
