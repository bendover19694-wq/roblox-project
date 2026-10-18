--!strict
-- Icons: every icon is drawn in code from Frames, UICorner, UIStroke and UIGradient. No images, no glyphs.
-- All coordinates are 0..1 of the icon box, so an icon scales to any size. One primary colour is tintable
-- (Icons.tint); secondary details carry the attribute Keep = true and keep their own colour.
-- Details that should read on any colour use translucent black (sh) or white (li) overlays.

local Theme = require(script.Parent.Theme)

local Icons = {}

type Corners = { tl: number?, tr: number?, br: number?, bl: number? }
type Opts = {
	rot: number?, -- degrees
	rad: number?, -- UICorner scale, 0.5 = fully round
	c: Corners?, -- per-corner scales (overrides rad)
	col: Color3?, -- fixed colour (Keep)
	t: number?, -- transparency of the primary or fixed colour
	sh: number?, -- translucent black overlay at this transparency (Keep)
	li: number?, -- translucent white overlay at this transparency (Keep)
	grad: { Color3 }?, -- top to bottom gradient (Keep)
}
type Ctx = { root: Frame, color: Color3, size: number }

local WHITE = Color3.new(1, 1, 1)
local BLACK = Color3.new(0, 0, 0)

local function look(c: Ctx, o: Opts): (Color3, number, boolean)
	if o.sh then
		return BLACK, o.sh, true
	elseif o.li then
		return WHITE, o.li, true
	elseif o.grad then
		return WHITE, o.t or 0, true
	elseif o.col then
		return o.col, o.t or 0, true
	end
	return c.color, o.t or 0, false
end

local function frame(c: Ctx, o: Opts, x: number, y: number, w: number, h: number, mid: boolean): Frame
	local col, tr, keep = look(c, o)
	local f = Instance.new("Frame")
	f.BorderSizePixel = 0
	f.BackgroundColor3 = col
	f.BackgroundTransparency = tr
	f.AnchorPoint = if mid then Vector2.new(0.5, 0.5) else Vector2.zero
	f.Position = UDim2.fromScale(x, y)
	f.Size = UDim2.fromScale(w, h)
	f.Rotation = o.rot or 0
	if keep then
		f:SetAttribute("Keep", true)
	end
	if o.c then
		local u = Instance.new("UICorner")
		u.TopLeftRadius = UDim.new(o.c.tl or 0, 0)
		u.TopRightRadius = UDim.new(o.c.tr or 0, 0)
		u.BottomRightRadius = UDim.new(o.c.br or 0, 0)
		u.BottomLeftRadius = UDim.new(o.c.bl or 0, 0)
		u.Parent = f
	elseif o.rad then
		local u = Instance.new("UICorner")
		u.CornerRadius = UDim.new(o.rad, 0)
		u.Parent = f
	end
	if o.grad then
		local g = Instance.new("UIGradient")
		g.Color = ColorSequence.new(o.grad[1], o.grad[2])
		g.Rotation = 90
		g.Parent = f
	end
	f.Parent = c.root
	return f
end

-- Box by top-left corner.
local function bx(c: Ctx, x: number, y: number, w: number, h: number, o: Opts?)
	frame(c, o or {}, x, y, w, h, false)
end

-- Box by centre.
local function cb(c: Ctx, cx: number, cy: number, w: number, h: number, o: Opts?)
	frame(c, o or {}, cx, cy, w, h, true)
end

-- Circle by centre and diameter.
local function ci(c: Ctx, cx: number, cy: number, d: number, o: Opts?)
	local oo: Opts = o or {}
	oo.rad = 0.5
	frame(c, oo, cx, cy, d, d, true)
end

-- Rounded line from point to point. k = thickness as a fraction of the icon.
local function ln(c: Ctx, x1: number, y1: number, x2: number, y2: number, k: number, o: Opts?)
	local oo: Opts = o or {}
	local th = math.max(k, 1 / c.size)
	local dx, dy = x2 - x1, y2 - y1
	oo.rot = math.deg(math.atan2(dy, dx))
	oo.rad = 0.5
	frame(c, oo, (x1 + x2) / 2, (y1 + y2) / 2, math.sqrt(dx * dx + dy * dy) + th, th, true)
end

-- Ring (or ellipse when h is given) drawn as an inner UIStroke.
local function rg(c: Ctx, cx: number, cy: number, d: number, k: number, o: Opts?, h: number?)
	local oo: Opts = o or {}
	local col, tr, keep = look(c, oo)
	local f = Instance.new("Frame")
	f.BorderSizePixel = 0
	f.BackgroundTransparency = 1
	f.AnchorPoint = Vector2.new(0.5, 0.5)
	f.Position = UDim2.fromScale(cx, cy)
	f.Size = UDim2.fromScale(d, h or d)
	f.Rotation = oo.rot or 0
	if keep then
		f:SetAttribute("Keep", true)
	end
	local u = Instance.new("UICorner")
	u.CornerRadius = UDim.new(0.5, 0)
	u.Parent = f
	local s = Instance.new("UIStroke")
	s.Color = col
	s.Transparency = tr
	s.Thickness = math.max(1, c.size * k)
	s.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
	s.BorderStrokePosition = Enum.BorderStrokePosition.Inner
	s.Parent = f
	f.Parent = c.root
end

-- Draws the rest of the icon inside a rotated child, so the icon's own Rotation stays free for callers.
local function group(c: Ctx, rot: number)
	local g = Instance.new("Frame")
	g.Name = "Body"
	g.BackgroundTransparency = 1
	g.BorderSizePixel = 0
	g.Size = UDim2.fromScale(1, 1)
	g.Rotation = rot
	g.Parent = c.root
	c.root = g
end

-- Solid triangle pointing right, built from thin vertical strips.
local function triRight(c: Ctx, x0: number, x1: number, y0: number, y1: number)
	local n = 18
	local sw = (x1 - x0) / n
	local ym = (y0 + y1) / 2
	for i = 0, n - 1 do
		local h = (y1 - y0) * (1 - (i + 0.5) / n)
		bx(c, x0 + i * sw, ym - h / 2, sw + 0.006, h)
	end
end

local shapes: { [string]: (Ctx) -> () } = {
	-- Points up and to the right, like the emoji it replaces (Map rotates it with a + 45 offset).
	rocket = function(c)
		group(c, 45)
		bx(c, 0.22, 0.5, 0.17, 0.3, { rad = 0.35, rot = 12 })
		bx(c, 0.61, 0.5, 0.17, 0.3, { rad = 0.35, rot = -12 })
		bx(c, 0.36, 0.06, 0.28, 0.66, { c = { tl = 0.5, tr = 0.5, bl = 0.12, br = 0.12 } })
		bx(c, 0.405, 0.14, 0.04, 0.36, { li = 0.6, rad = 0.5 })
		ci(c, 0.5, 0.34, 0.17, { col = Theme.navy })
		ci(c, 0.5, 0.34, 0.1, { col = Theme.cyan })
		bx(c, 0.41, 0.69, 0.18, 0.07, { sh = 0.5, rad = 0.3 })
		bx(
			c,
			0.43,
			0.77,
			0.14,
			0.2,
			{ grad = { Theme.amber, Theme.orange }, c = { tl = 0.1, tr = 0.1, bl = 0.5, br = 0.5 } }
		)
	end,
	satellite = function(c)
		group(c, -35)
		bx(c, 0.05, 0.38, 0.27, 0.24, { rad = 0.12 })
		bx(c, 0.68, 0.38, 0.27, 0.24, { rad = 0.12 })
		for _, x in { 0.14, 0.23, 0.77, 0.86 } do
			bx(c, x, 0.38, 0.02, 0.24, { sh = 0.55 })
		end
		bx(c, 0.05, 0.49, 0.27, 0.02, { sh = 0.55 })
		bx(c, 0.68, 0.49, 0.27, 0.02, { sh = 0.55 })
		bx(c, 0.31, 0.47, 0.38, 0.06)
		bx(c, 0.38, 0.32, 0.24, 0.36, { rad = 0.2 })
		ci(c, 0.5, 0.5, 0.1, { li = 0.35 })
		ln(c, 0.5, 0.32, 0.5, 0.2, 0.035)
		ci(c, 0.5, 0.16, 0.1)
	end,
	trophy = function(c)
		rg(c, 0.22, 0.28, 0.22, 0.055)
		rg(c, 0.78, 0.28, 0.22, 0.055)
		bx(c, 0.28, 0.1, 0.44, 0.42, { c = { tl = 0.05, tr = 0.05, bl = 0.5, br = 0.5 } })
		bx(c, 0.45, 0.5, 0.1, 0.17)
		bx(c, 0.3, 0.66, 0.4, 0.1, { rad = 0.3 })
		bx(c, 0.22, 0.76, 0.56, 0.12, { rad = 0.3 })
		bx(c, 0.34, 0.16, 0.05, 0.22, { li = 0.55, rad = 0.5 })
		ci(c, 0.5, 0.3, 0.12, { sh = 0.7 })
	end,
	gift = function(c)
		rg(c, 0.38, 0.2, 0.22, 0.055)
		rg(c, 0.62, 0.2, 0.22, 0.055)
		bx(c, 0.18, 0.44, 0.64, 0.42, { rad = 0.08 })
		bx(c, 0.12, 0.3, 0.76, 0.16, { rad = 0.1 })
		bx(c, 0.445, 0.3, 0.11, 0.56, { li = 0.4 })
		bx(c, 0.12, 0.43, 0.76, 0.025, { sh = 0.6 })
	end,
	gear = function(c)
		for i = 0, 3 do
			cb(c, 0.5, 0.5, 0.16, 0.92, { rad = 0.12, rot = i * 45 })
		end
		ci(c, 0.5, 0.5, 0.66)
		ci(c, 0.5, 0.5, 0.26, { sh = 0.25 })
	end,
	bag = function(c)
		rg(c, 0.5, 0.34, 0.32, 0.06)
		bx(c, 0.2, 0.34, 0.6, 0.52, { rad = 0.1 })
		ci(c, 0.4, 0.46, 0.06, { sh = 0.35 })
		ci(c, 0.6, 0.46, 0.06, { sh = 0.35 })
		bx(c, 0.26, 0.38, 0.05, 0.34, { li = 0.65, rad = 0.5 })
	end,
	more = function(c)
		ci(c, 0.2, 0.5, 0.17)
		ci(c, 0.5, 0.5, 0.17)
		ci(c, 0.8, 0.5, 0.17)
	end,
	close = function(c)
		ln(c, 0.25, 0.25, 0.75, 0.75, 0.11)
		ln(c, 0.75, 0.25, 0.25, 0.75, 0.11)
	end,
	check = function(c)
		ln(c, 0.22, 0.54, 0.42, 0.72, 0.12)
		ln(c, 0.42, 0.72, 0.78, 0.3, 0.12)
	end,
	lock = function(c)
		rg(c, 0.5, 0.36, 0.38, 0.07, nil, 0.5)
		bx(c, 0.22, 0.44, 0.56, 0.44, { rad = 0.12 })
		ci(c, 0.5, 0.62, 0.1, { sh = 0.25 })
		bx(c, 0.475, 0.64, 0.05, 0.14, { sh = 0.25, rad = 0.4 })
	end,
	star = function(c)
		-- a pentagram of thick rounded strokes fills the five points; a disc fills the centre pentagon
		local pts = {}
		for k = 0, 4 do
			local a = math.rad(-90 + 72 * k)
			pts[k] = { 0.5 + 0.43 * math.cos(a), 0.55 + 0.43 * math.sin(a) }
		end
		for k = 0, 4 do
			local p, q = pts[k], pts[(k + 2) % 5]
			ln(c, p[1], p[2], q[1], q[2], 0.17)
		end
		ci(c, 0.5, 0.56, 0.36)
	end,
	coin = function(c)
		ci(c, 0.5, 0.5, 0.86)
		rg(c, 0.5, 0.5, 0.64, 0.035, { sh = 0.55 })
		bx(c, 0.46, 0.3, 0.08, 0.4, { sh = 0.45, rad = 0.5 })
		bx(c, 0.36, 0.38, 0.28, 0.06, { sh = 0.45, rad = 0.5 })
		bx(c, 0.36, 0.56, 0.28, 0.06, { sh = 0.45, rad = 0.5 })
	end,
	clock = function(c)
		rg(c, 0.5, 0.5, 0.86, 0.085)
		ln(c, 0.5, 0.5, 0.5, 0.27, 0.07)
		ln(c, 0.5, 0.5, 0.67, 0.6, 0.07)
		ci(c, 0.5, 0.5, 0.1)
	end,
	fuel = function(c)
		bx(c, 0.18, 0.12, 0.44, 0.74, { rad = 0.08 })
		bx(c, 0.12, 0.84, 0.56, 0.08, { rad = 0.4 })
		bx(c, 0.25, 0.2, 0.3, 0.2, { sh = 0.35, rad = 0.1 })
		ci(c, 0.4, 0.62, 0.16, { li = 0.35 })
		ln(c, 0.62, 0.3, 0.8, 0.3, 0.06)
		ln(c, 0.8, 0.3, 0.8, 0.6, 0.06)
		bx(c, 0.74, 0.58, 0.12, 0.18, { rad = 0.3 })
	end,
	seat = function(c)
		bx(c, 0.24, 0.1, 0.22, 0.54, { rad = 0.35, rot = -8 })
		bx(c, 0.26, 0.54, 0.54, 0.2, { rad = 0.35 })
		bx(c, 0.66, 0.66, 0.11, 0.24, { rad = 0.3 })
		bx(c, 0.2, 0.86, 0.64, 0.07, { rad = 0.5 })
	end,
	warning = function(c)
		ln(c, 0.5, 0.15, 0.13, 0.8, 0.1)
		ln(c, 0.5, 0.15, 0.87, 0.8, 0.1)
		ln(c, 0.13, 0.8, 0.87, 0.8, 0.1)
		ln(c, 0.5, 0.38, 0.5, 0.57, 0.085)
		ci(c, 0.5, 0.69, 0.1)
	end,
	info = function(c)
		rg(c, 0.5, 0.5, 0.86, 0.08)
		ci(c, 0.5, 0.3, 0.1)
		bx(c, 0.455, 0.43, 0.09, 0.3, { rad = 0.4 })
	end,
	arrowRight = function(c)
		ln(c, 0.18, 0.5, 0.8, 0.5, 0.1)
		ln(c, 0.8, 0.5, 0.58, 0.28, 0.1)
		ln(c, 0.8, 0.5, 0.58, 0.72, 0.1)
	end,
	arrowUp = function(c)
		ln(c, 0.5, 0.82, 0.5, 0.2, 0.1)
		ln(c, 0.5, 0.2, 0.28, 0.42, 0.1)
		ln(c, 0.5, 0.2, 0.72, 0.42, 0.1)
	end,
	arrowDown = function(c)
		ln(c, 0.5, 0.18, 0.5, 0.8, 0.1)
		ln(c, 0.5, 0.8, 0.28, 0.58, 0.1)
		ln(c, 0.5, 0.8, 0.72, 0.58, 0.1)
	end,
	chevron = function(c)
		ln(c, 0.36, 0.2, 0.66, 0.5, 0.11)
		ln(c, 0.66, 0.5, 0.36, 0.8, 0.11)
	end,
	plus = function(c)
		ln(c, 0.5, 0.2, 0.5, 0.8, 0.11)
		ln(c, 0.2, 0.5, 0.8, 0.5, 0.11)
	end,
	planet = function(c)
		ci(c, 0.5, 0.5, 0.86)
		ci(c, 0.38, 0.4, 0.28, { sh = 0.65 })
		ci(c, 0.62, 0.64, 0.22, { sh = 0.65 })
		bx(c, 0.56, 0.26, 0.22, 0.13, { sh = 0.65, rad = 0.5 })
		bx(c, 0.24, 0.24, 0.08, 0.18, { li = 0.5, rad = 0.5, rot = 35 })
	end,
	ringPlanet = function(c)
		ci(c, 0.5, 0.5, 0.52)
		bx(c, 0.32, 0.34, 0.07, 0.14, { li = 0.5, rad = 0.5, rot = 35 })
		rg(c, 0.5, 0.5, 0.96, 0.12, { sh = 0.5, rot = -22 }, 0.4)
		rg(c, 0.5, 0.5, 0.94, 0.065, { rot = -22 }, 0.38)
	end,
	flame = function(c)
		-- teardrop: a square with three round corners, turned so the sharp corner points up
		bx(c, 0.24, 0.32, 0.52, 0.52, { c = { tl = 0.5, tr = 0, br = 0.5, bl = 0.5 }, rot = -45 })
		bx(c, 0.36, 0.52, 0.28, 0.28, { c = { tl = 0.5, tr = 0, br = 0.5, bl = 0.5 }, rot = -45, li = 0.45 })
	end,
	chart = function(c)
		bx(c, 0.16, 0.52, 0.17, 0.33, { rad = 0.2 })
		bx(c, 0.41, 0.34, 0.17, 0.51, { rad = 0.2 })
		bx(c, 0.66, 0.16, 0.17, 0.69, { rad = 0.2 })
		bx(c, 0.1, 0.88, 0.8, 0.05, { rad = 0.5 })
	end,
	bolt = function(c)
		ln(c, 0.6, 0.12, 0.32, 0.54, 0.16)
		ln(c, 0.68, 0.46, 0.4, 0.88, 0.16)
		bx(c, 0.32, 0.44, 0.38, 0.12)
	end,
	wrench = function(c)
		ln(c, 0.26, 0.74, 0.6, 0.4, 0.13)
		ci(c, 0.68, 0.32, 0.38)
		cb(c, 0.8, 0.2, 0.13, 0.22, { sh = 0.15, rot = 45 })
		ci(c, 0.25, 0.75, 0.17)
	end,
	clipboard = function(c)
		bx(c, 0.2, 0.16, 0.6, 0.72, { rad = 0.1 })
		bx(c, 0.35, 0.07, 0.3, 0.13, { rad = 0.3 })
		bx(c, 0.4, 0.11, 0.2, 0.04, { sh = 0.5, rad = 0.5 })
		bx(c, 0.3, 0.36, 0.4, 0.05, { sh = 0.5, rad = 0.5 })
		bx(c, 0.3, 0.5, 0.4, 0.05, { sh = 0.5, rad = 0.5 })
		bx(c, 0.3, 0.64, 0.24, 0.05, { sh = 0.5, rad = 0.5 })
	end,
	patch = function(c)
		ci(c, 0.5, 0.5, 0.88)
		rg(c, 0.5, 0.5, 0.68, 0.035, { li = 0.25 })
		ci(c, 0.5, 0.5, 0.26, { li = 0.35 })
		bx(c, 0.3, 0.2, 0.1, 0.05, { li = 0.55, rad = 0.5, rot = -40 })
	end,
	soundOn = function(c)
		bx(c, 0.12, 0.4, 0.2, 0.2, { rad = 0.1 })
		cb(c, 0.4, 0.5, 0.3, 0.3, { rad = 0.1, rot = 45 })
		ln(c, 0.64, 0.4, 0.64, 0.6, 0.06)
		ln(c, 0.76, 0.3, 0.76, 0.7, 0.06)
		ln(c, 0.88, 0.2, 0.88, 0.8, 0.06)
	end,
	soundOff = function(c)
		bx(c, 0.1, 0.4, 0.2, 0.2, { rad = 0.1 })
		cb(c, 0.38, 0.5, 0.3, 0.3, { rad = 0.1, rot = 45 })
		ln(c, 0.62, 0.38, 0.88, 0.62, 0.075)
		ln(c, 0.88, 0.38, 0.62, 0.62, 0.075)
	end,
	play = function(c)
		triRight(c, 0.26, 0.8, 0.16, 0.84)
	end,
	astronaut = function(c)
		bx(c, 0.2, 0.7, 0.6, 0.28, { c = { tl = 0.45, tr = 0.45 } })
		ci(c, 0.14, 0.42, 0.12)
		ci(c, 0.86, 0.42, 0.12)
		ci(c, 0.5, 0.4, 0.66)
		cb(c, 0.5, 0.42, 0.46, 0.36, { col = Theme.navy, rad = 0.45 })
		cb(c, 0.6, 0.4, 0.14, 0.14, { col = Theme.cyan, rad = 0.5, t = 0.35 })
		cb(c, 0.38, 0.34, 0.1, 0.06, { li = 0.3, rad = 0.5, rot = -25 })
		ci(c, 0.5, 0.85, 0.08, { col = Theme.cyan })
	end,
	question = function(c)
		local cx, cy, r = 0.5, 0.33, 0.2
		local px, py = 0, 0
		for i, deg in { 195, 235, 270, 310, 350, 30, 62 } do
			local a = math.rad(deg)
			local x, y = cx + r * math.cos(a), cy + r * math.sin(a)
			if i > 1 then
				ln(c, px, py, x, y, 0.1)
			end
			px, py = x, y
		end
		ln(c, px, py, 0.5, 0.6, 0.1)
		ci(c, 0.5, 0.82, 0.11)
	end,
}

local warned: { [string]: boolean } = {}

function Icons.has(name: string): boolean
	return shapes[name] ~= nil
end

-- Every icon name, sorted (used by scripts/probes/icons.luau).
function Icons.names(): { string }
	local out = {}
	for name in shapes do
		table.insert(out, name)
	end
	table.sort(out)
	return out
end

-- Returns a transparent size x size Frame named "Icon". Unknown names draw a question mark and warn once.
function Icons.make(name: string, size: number, color: Color3): Frame
	local draw = shapes[name]
	if not draw then
		if not warned[name] then
			warned[name] = true
			warn("Icons: unknown icon " .. name)
		end
		draw = shapes.question
	end
	local root = Instance.new("Frame")
	root.Name = "Icon"
	root.BackgroundTransparency = 1
	root.BorderSizePixel = 0
	root.Size = UDim2.fromOffset(size, size)
	root:SetAttribute("Icon", name)
	draw({ root = root, color = color, size = size })
	return root
end

-- Recolours the parts drawn in the primary colour. Parts marked Keep are left alone.
function Icons.tint(icon: Instance, color: Color3)
	for _, d in icon:GetDescendants() do
		if d:IsA("Frame") then
			if d.BackgroundTransparency < 1 and not d:GetAttribute("Keep") then
				d.BackgroundColor3 = color
			end
		elseif d:IsA("UIStroke") then
			local p = d.Parent
			if p and not p:GetAttribute("Keep") then
				d.Color = color
			end
		end
	end
end

return Icons
