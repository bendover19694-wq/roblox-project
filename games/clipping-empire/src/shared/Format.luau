--!strict
-- Number formatting shared by client and server. Pure.
-- Rounds down, so a label never shows more than the player has (999,999 is "999.9K", not "1M").

local Format = {}

local SUFFIXES: { { any } } = { { 1e15, "Qa" }, { 1e12, "T" }, { 1e9, "B" }, { 1e6, "M" }, { 1e3, "K" } }

function Format.short(n: number): string
	local sign = if n < 0 then "-" else ""
	n = math.abs(n)
	for _, s in SUFFIXES do
		if n >= s[1] then
			local v = math.floor(n / s[1] * 10) / 10
			return `{sign}{(string.format("%.1f", v):gsub("%.0$", ""))}{s[2]}`
		end
	end
	return `{sign}{math.floor(n)}`
end

function Format.money(n: number): string
	local s = Format.short(n)
	return if n < 0 then "-$" .. s:sub(2) else "$" .. s
end

-- A multiplier label: "x2.25", "x11.4", "x1.2K". Rounds down like every other label.
function Format.mult(n: number): string
	if n >= 1000 then
		return "x" .. Format.short(n)
	end
	local v = if n < 10 then math.floor(n * 100) / 100 else math.floor(n * 10) / 10
	local text = string.format("%.2f", v):gsub("0+$", ""):gsub("%.$", "")
	return "x" .. text
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
