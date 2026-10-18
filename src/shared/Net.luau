--!strict
-- Remote payload validation and rate limiting. Every client to server remote goes through here.
-- Pure (clock is injectable) so tests run under Lune.

local Net = {}

Net.MAX_STRING = 32

function Net.isFinite(v: any): boolean
	return type(v) == "number" and v == v and v ~= math.huge and v ~= -math.huge
end

-- A whole number within [lo, hi].
function Net.isInt(v: any, lo: number, hi: number): boolean
	return Net.isFinite(v) and v == math.floor(v) and v >= lo and v <= hi
end

function Net.isEnum(v: any, set: { [string]: boolean }): boolean
	return type(v) == "string" and #v <= Net.MAX_STRING and set[v] == true
end

-- A Vector3 arrives as a real Vector3 from Roblox remotes; tests pass {X, Y, Z} tables.
function Net.isVector(v: any): boolean
	return (typeof(v) == "Vector3" or type(v) == "table")
		and Net.isFinite(v.X)
		and Net.isFinite(v.Y)
		and Net.isFinite(v.Z)
end

-- Token bucket per key. `allow(key)` returns false when the key is over its rate.
function Net.limiter(perSecond: number, burst: number, clock: (() -> number)?)
	local now = clock or os.clock
	local buckets: { [any]: { tokens: number, at: number } } = {}
	return function(key: any): boolean
		local t = now()
		local b = buckets[key]
		if not b then
			b = { tokens = burst, at = t }
			buckets[key] = b
		end
		b.tokens = math.min(burst, b.tokens + (t - b.at) * perSecond)
		b.at = t
		if b.tokens < 1 then
			return false
		end
		b.tokens -= 1
		return true
	end
end

return Net
