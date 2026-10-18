--!strict
-- Daily contracts: three small goals per UTC day, rolled deterministically from the day number
-- so a rejoin never re-rolls. Pure (tests/Contracts.spec.luau).

local Destinations = require(script.Parent.Config.Destinations)
local Format = require(script.Parent.Format)
local Tuning = require(script.Parent.Config.Tuning)

export type Contract = {
	kind: string,
	dest: string?,
	target: number,
	reward: number,
	progress: number,
	claimed: boolean,
}

local Contracts = {}

function Contracts.roll(day: number, stage: number): { Contract }
	local cfg = Tuning.contracts
	local mult = Tuning.stageRewardMult[math.clamp(stage, 1, #Tuning.stageRewardMult)]
	local s = day % 2147483646 + 1
	-- Park-Miller; returns 1..n
	local function rand(n: number): number
		s = s * 16807 % 2147483647
		return s % n + 1
	end

	local pool = table.clone(cfg.templates)
	local out: { Contract } = {}
	for _ = 1, math.min(cfg.count, #pool) do
		local tpl = table.remove(pool, rand(#pool)) :: any
		local i = rand(#tpl.targets)
		local dest: string? = nil
		if tpl.kind == "tripsTo" then
			local ok = {}
			for _, d in Destinations.list do
				if d.stage <= stage then
					table.insert(ok, d.id)
				end
			end
			dest = ok[rand(#ok)]
		end
		table.insert(out, {
			kind = tpl.kind,
			dest = dest,
			target = tpl.targets[i] * (if tpl.scales then mult else 1),
			reward = tpl.reward * i * mult,
			progress = 0,
			claimed = false,
		})
	end
	return out
end

-- Re-rolls only when the stored day is not today. Returns true when it did.
function Contracts.ensure(state: { day: number, list: { any } }, day: number, stage: number): boolean
	if state.day == day then
		return false
	end
	state.day = day
	state.list = Contracts.roll(day, stage)
	return true
end

function Contracts.bump(list: { any }, kind: string, amount: number, dest: string?)
	for _, c in list do
		if c.kind == kind and (kind ~= "tripsTo" or c.dest == dest) then
			c.progress = math.min(c.target, c.progress + amount)
		end
	end
end

-- Returns the reward once, when the contract is done and not yet claimed.
function Contracts.claim(list: { any }, index: number): (number?, string?)
	local c = list[index]
	if c == nil then
		return nil, "No such contract"
	end
	if c.claimed then
		return nil, "Already claimed"
	end
	if c.progress < c.target then
		return nil, "Not done yet"
	end
	c.claimed = true
	return c.reward, nil
end

function Contracts.label(c: Contract): string
	local n = c.target
	if c.kind == "trips" then
		return `Fly {n} trips`
	elseif c.kind == "tripsTo" then
		local d = Destinations.byId[c.dest :: string]
		return `Fly {n} trips to {if d then d.name else "orbit"}`
	elseif c.kind == "passengers" then
		return `Carry {n} passengers`
	elseif c.kind == "earned" then
		return `Earn {Format.money(n)} from trips`
	end
	return `Plan {n} new {if n == 1 then "mission" else "missions"}`
end

return Contracts
