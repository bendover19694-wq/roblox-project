--!strict
-- Seeded PRNG (Park-Miller minimal standard). Same seed => same sequence on every machine. Pure.

export type Rng = { s: number }

local M = 2147483647
local A = 16807

local Rng = {}

function Rng.new(seed: number): Rng
	local s = math.floor(math.abs(seed)) % (M - 1)
	if s == 0 then
		s = 1
	end
	local r = { s = s }
	for _ = 1, 8 do -- warm-up: consecutive seeds must not give near-identical first draws
		r.s = r.s * A % M
	end
	return r
end

function Rng.next(r: Rng): number
	r.s = r.s * A % M
	return (r.s - 1) / (M - 1)
end

-- Inclusive whole number in [lo, hi].
function Rng.int(r: Rng, lo: number, hi: number): number
	return lo + math.floor(Rng.next(r) * (hi - lo + 1))
end

-- Weighted pick; keys are walked in sorted order so the result is deterministic.
function Rng.pick<T>(r: Rng, weights: { [T]: number }): T
	local keys: { T } = {}
	local total = 0
	for k, w in weights do
		table.insert(keys, k)
		total += w
	end
	table.sort(keys, function(a: any, b: any)
		return tostring(a) < tostring(b)
	end)
	local roll = Rng.next(r) * total
	for _, k in keys do
		roll -= weights[k]
		if roll < 0 then
			return k
		end
	end
	return keys[#keys]
end

return Rng
