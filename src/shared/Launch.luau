--!strict
-- Perfect Launch timing. The server judges with its own receive time. Pure (tests/Launch.spec.luau).

local Tuning = require(script.Parent.Config.Tuning)

local Launch = {}

-- (opensAt, closesAt) in server time for a mission that departs at `departAt`.
function Launch.window(departAt: number): (number, number)
	local p = Tuning.perfectLaunch
	return departAt + p.opensAfter, departAt + p.opensAfter + p.windowSeconds
end

-- True when `t` is inside the window, allowing a short grace for network delay.
function Launch.judge(t: number, departAt: number): boolean
	local opensAt, closesAt = Launch.window(departAt)
	return t >= opensAt and t <= closesAt + Tuning.perfectLaunch.graceSeconds
end

return Launch
