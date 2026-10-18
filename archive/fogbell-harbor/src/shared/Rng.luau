--!strict
-- Deterministic Park–Miller PRNG. Pure Luau (no Roblox `Random`) so tests run under Lune.
-- state * A stays below 2^53, so the math is exact in doubles.

local Rng = {}
Rng.__index = Rng

export type Rng = typeof(setmetatable({} :: { state: number }, Rng))

local M = 2147483647
local A = 48271

function Rng.new(seed: number): Rng
	local s = math.floor(math.abs(seed)) % M
	if s == 0 then
		s = 1
	end
	return setmetatable({ state = s }, Rng)
end

-- Uniform in [0, 1).
function Rng.next(self: Rng): number
	self.state = (self.state * A) % M
	return (self.state - 1) / (M - 1)
end

-- Uniform integer in [lo, hi].
function Rng.int(self: Rng, lo: number, hi: number): number
	return lo + math.floor(self:next() * (hi - lo + 1))
end

function Rng.pick<T>(self: Rng, list: { T }): T
	return list[self:int(1, #list)]
end

return Rng
