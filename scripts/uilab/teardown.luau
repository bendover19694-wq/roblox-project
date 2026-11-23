--!strict
-- UI Lab teardown: read a Roblox file (.rbxm .rbxmx .rbxl .rbxlx) and print one JSON report.
-- Usage: lune run scripts/uilab/teardown.luau <file>
-- Reads only: scripts in the file are counted, never run. Images are reported as asset ids for HQ to fetch thumbnails.
local fs = require("@lune/fs")
local net = require("@lune/serde")
local process = require("@lune/process")
local roblox = require("@lune/roblox")

local path = process.args[1]
if not path then
	error("usage: lune run scripts/uilab/teardown.luau <file>")
end
local raw = fs.readFile(path)
local lower = string.lower(path)
local roots: { any }
if string.match(lower, "%.rbxlx?$") then
	roots = { roblox.deserializePlace(raw) }
else
	roots = roblox.deserializeModel(raw)
end

local IMAGE_PROPS = {
	ImageLabel = { "Image", "HoverImage", "PressedImage" },
	ImageButton = { "Image", "HoverImage", "PressedImage" },
	Decal = { "Texture" },
	Texture = { "Texture" },
	MeshPart = { "TextureID" },
	ParticleEmitter = { "Texture" },
	Beam = { "Texture" },
	Trail = { "Texture" },
	SurfaceAppearance = { "ColorMap" },
	Sky = { "SkyboxBk", "SkyboxUp" },
}
local COLOR_PROPS = { "BackgroundColor3", "TextColor3", "ImageColor3", "Color", "TextStrokeColor3", "BorderColor3" }
local GUI = { ScreenGui = true, SurfaceGui = true, BillboardGui = true, Frame = true, ScrollingFrame = true, TextLabel = true, TextButton = true, ImageLabel = true, ImageButton = true, CanvasGroup = true, ViewportFrame = true }
local TAGS = {
	shop = { "shop", "store", "buy", "purchase", "gamepass", "robux" },
	["crates / lootbox"] = { "crate", "egg", "lootbox", "chest", "gacha", "spin" },
	["daily rewards"] = { "daily", "reward", "streak", "login" },
	index = { "index", "collection", "pokedex", "catalog" },
	inventory = { "inventory", "backpack", "hotbar", "slot" },
	quests = { "quest", "mission", "task", "objective" },
	rebirth = { "rebirth", "prestige", "ascend" },
	settings = { "setting", "option", "toggle" },
	["season pass"] = { "season", "battlepass", "pass" },
	["overhead nametag"] = { "nametag", "overhead", "billboard", "rank" },
	hud = { "hud", "sidebar", "leftrail", "menu" },
	leaderboard = { "leaderboard", "leaderstat", "top" },
	trade = { "trade", "offer" },
	notifications = { "notification", "popup", "toast", "alert" },
}

local function hex(c: any): string
	local function b(v: number): string
		return string.format("%02x", math.clamp(math.floor(v * 255 + 0.5), 0, 255))
	end
	return "#" .. b(c.R) .. b(c.G) .. b(c.B)
end

local function assetId(s: any): string?
	if type(s) ~= "string" then
		return nil
	end
	return string.match(s, "rbxassetid://(%d+)") or string.match(s, "[?&]id=(%d+)") or string.match(s, "^(%d+)$")
end

local counts = { objects = 0, gui = 0, scripts = 0, images = 0 }
local images: { [string]: { id: string, uses: number, class: string, name: string, size: string? } } = {}
local colors: { [string]: number } = {}
local gradients: { [string]: { stops: { string }, uses: number } } = {}
local fonts: { [string]: number } = {}
local strokes: { [string]: number } = {}
local corners: { [string]: number } = {}
local tagHits: { [string]: number } = {}
local names: { string } = {}

local function safe(inst: any, prop: string): any
	local ok, v = pcall(function()
		return inst[prop]
	end)
	return if ok then v else nil
end

local function visit(inst: any)
	counts.objects += 1
	local class = inst.ClassName
	if class == "Script" or class == "LocalScript" or class == "ModuleScript" then
		counts.scripts += 1
	end
	if GUI[class] then
		counts.gui += 1
	end
	local lname = string.lower(inst.Name)
	for tag, words in TAGS do
		for _, w in words do
			if string.find(lname, w, 1, true) then
				tagHits[tag] = (tagHits[tag] or 0) + 1
				break
			end
		end
	end
	if #names < 400 and GUI[class] then
		table.insert(names, class .. ":" .. inst.Name)
	end
	local props = IMAGE_PROPS[class]
	if props then
		for _, p in props do
			local id = assetId(safe(inst, p))
			if id then
				local e = images[id]
				if not e then
					local size = safe(inst, "AbsoluteSize") or safe(inst, "Size")
					e = { id = id, uses = 0, class = class, name = inst.Name, size = if size then tostring(size) else nil }
					images[id] = e
					counts.images += 1
				end
				e.uses += 1
			end
		end
	end
	for _, p in COLOR_PROPS do
		local c = safe(inst, p)
		if typeof(c) == "Color3" then
			local h = hex(c)
			colors[h] = (colors[h] or 0) + 1
		end
	end
	if class == "UIGradient" then
		local seq = safe(inst, "Color")
		if typeof(seq) == "ColorSequence" then
			local stops = {}
			for _, k in seq.Keypoints do
				table.insert(stops, hex(k.Value))
			end
			local key = table.concat(stops, ">")
			local g = gradients[key] or { stops = stops, uses = 0 }
			g.uses += 1
			gradients[key] = g
		end
	elseif class == "UIStroke" then
		local t = safe(inst, "Thickness")
		if type(t) == "number" then
			local k = tostring(math.floor(t * 10 + 0.5) / 10)
			strokes[k] = (strokes[k] or 0) + 1
		end
	elseif class == "UICorner" then
		local r = safe(inst, "CornerRadius")
		if r then
			local k = string.format("%.2f+%d", r.Scale, r.Offset)
			corners[k] = (corners[k] or 0) + 1
		end
	end
	local f = safe(inst, "FontFace")
	if typeof(f) == "Font" then
		local fam = string.match(f.Family, "([%w%-]+)%.json$") or f.Family
		local k = fam .. " " .. tostring(f.Weight)
		fonts[k] = (fonts[k] or 0) + 1
	end
	for _, child in inst:GetChildren() do
		visit(child)
	end
end

for _, r in roots do
	visit(r)
end

local function ranked(map: { [string]: number }, limit: number): { { key: string, n: number } }
	local out = {}
	for k, n in map do
		table.insert(out, { key = k, n = n })
	end
	table.sort(out, function(a, b)
		return a.n > b.n
	end)
	while #out > limit do
		table.remove(out)
	end
	return out
end

local imageList = {}
for _, e in images do
	table.insert(imageList, e)
end
table.sort(imageList, function(a, b)
	return a.uses > b.uses
end)
local gradList = {}
for _, g in gradients do
	table.insert(gradList, g)
end
table.sort(gradList, function(a, b)
	return a.uses > b.uses
end)
local tagList = {}
for _, t in ranked(tagHits, 8) do
	table.insert(tagList, t.key)
end

print(net.encode("json", {
	counts = counts,
	images = imageList,
	palette = ranked(colors, 24),
	gradients = gradList,
	fonts = ranked(fonts, 12),
	strokes = ranked(strokes, 8),
	corners = ranked(corners, 8),
	tags = tagList,
	names = names,
}))
