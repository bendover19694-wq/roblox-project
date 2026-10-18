--!strict
-- Number formatting shared by client and server. Pure.

local Format = {}

function Format.money(n: number): string
	local sign = if n < 0 then "-" else ""
	n = math.abs(n)
	if n >= 1e9 then
		return `{sign}${string.format("%.1f", n / 1e9):gsub("%.0$", "")}B`
	elseif n >= 1e6 then
		return `{sign}${string.format("%.1f", n / 1e6):gsub("%.0$", "")}M`
	elseif n >= 1e3 then
		return `{sign}${string.format("%.1f", n / 1e3):gsub("%.0$", "")}K`
	end
	return `{sign}${math.floor(n)}`
end

function Format.int(n: number): string
	local s = tostring(math.floor(n))
	local out = s:reverse():gsub("(%d%d%d)", "%1,"):reverse()
	return (out:gsub("^,", ""))
end

function Format.duration(sec: number): string
	sec = math.max(0, math.floor(sec))
	if sec < 60 then
		return `{sec}s`
	elseif sec < 3600 then
		return `{math.floor(sec / 60)}m {sec % 60}s`
	end
	return `{math.floor(sec / 3600)}h {math.floor(sec % 3600 / 60)}m`
end

return Format
