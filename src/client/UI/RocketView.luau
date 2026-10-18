--!strict
-- 3D rocket renders in ViewportFrames, built from primitives in the agency colour. No image assets needed.

local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Rockets = require(ReplicatedStorage.Shared.Config.Rockets)

local RocketView = {}

local WHITE = Color3.fromRGB(245, 247, 252)
local DARK = Color3.fromRGB(46, 52, 70)

local function part(
	model: Model,
	shape: Enum.PartType,
	size: Vector3,
	cf: CFrame,
	color: Color3,
	material: Enum.Material?
)
	local p = Instance.new("Part")
	p.Shape = shape
	p.Size = size
	p.CFrame = cf
	p.Color = color
	p.Material = material or Enum.Material.SmoothPlastic
	p.Anchored = true
	p.Parent = model
	return p
end

-- A rocket lying along +X (nose to the right), centred on the origin.
local function build(modelId: string, color: Color3, flame: boolean?): Model
	local spec = Rockets.byId[modelId] or Rockets.list[1]
	local s = spec.scale
	local m = Instance.new("Model")
	local len, r = 6 * s, 0.75 * s
	-- body (cylinders are along X already)
	part(m, Enum.PartType.Cylinder, Vector3.new(len, r * 2, r * 2), CFrame.new(0, 0, 0), WHITE)
	-- agency stripe and window band
	part(
		m,
		Enum.PartType.Cylinder,
		Vector3.new(0.5 * s, r * 2.04, r * 2.04),
		CFrame.new(len * 0.15, 0, 0),
		color
	)
	part(
		m,
		Enum.PartType.Cylinder,
		Vector3.new(0.2 * s, r * 2.04, r * 2.04),
		CFrame.new(-len * 0.2, 0, 0),
		color
	)
	-- nose: stacked shrinking discs + tip
	local x = len / 2
	for i, k in { 0.85, 0.6, 0.35 } do
		local w = 0.45 * s
		part(
			m,
			Enum.PartType.Cylinder,
			Vector3.new(w, r * 2 * k, r * 2 * k),
			CFrame.new(x + w / 2 + (i - 1) * w, 0, 0),
			if i == 1 then WHITE else color
		)
	end
	part(
		m,
		Enum.PartType.Ball,
		Vector3.new(r * 0.7, r * 0.7, r * 0.7),
		CFrame.new(x + 3 * 0.45 * s + r * 0.1, 0, 0),
		color
	)
	-- nozzle
	part(
		m,
		Enum.PartType.Cylinder,
		Vector3.new(0.5 * s, r * 1.3, r * 1.3),
		CFrame.new(-len / 2 - 0.25 * s, 0, 0),
		DARK,
		Enum.Material.Metal
	)
	-- fins (wedges pointing back)
	for _, angle in { 0, 120, 240 } do
		local fin = Instance.new("WedgePart")
		fin.Size = Vector3.new(0.15 * s, r * 1.4, 1.4 * s)
		fin.Color = color
		fin.Anchored = true
		fin.CFrame = CFrame.Angles(math.rad(angle), 0, 0)
			* CFrame.new(-len / 2 + 0.7 * s, r * 1.45, 0)
			* CFrame.Angles(0, math.rad(90), 0)
		fin.Parent = m
	end
	-- side boosters
	for i = 1, spec.boosters do
		local a = math.rad(90 + (i - 1) * 360 / spec.boosters)
		local off = Vector3.new(-len * 0.12, math.cos(a) * r * 1.6, math.sin(a) * r * 1.6)
		part(m, Enum.PartType.Cylinder, Vector3.new(len * 0.6, r * 0.9, r * 0.9), CFrame.new(off), WHITE)
		part(
			m,
			Enum.PartType.Ball,
			Vector3.new(r * 0.9, r * 0.9, r * 0.9),
			CFrame.new(off + Vector3.new(len * 0.3, 0, 0)),
			color
		)
	end
	if flame then
		for i, k in { 1.2, 0.85, 0.5 } do
			local f = part(
				m,
				Enum.PartType.Ball,
				Vector3.new(r * 2.2 * k, r * 1.4 * k, r * 1.4 * k),
				CFrame.new(-len / 2 - 0.6 * s - i * 0.55 * s, 0, 0),
				if i == 1 then Color3.fromRGB(255, 220, 120) else Color3.fromRGB(255, 120, 40),
				Enum.Material.Neon
			)
			f.Transparency = 0.1 * i
		end
	end
	return m
end

-- Returns a ViewportFrame showing the rocket. `size` is the frame size.
function RocketView.new(
	modelId: string,
	color: Color3,
	size: UDim2,
	opts: { flame: boolean?, tilt: number?, bg: Color3? }?
): ViewportFrame
	local o: any = opts or {}
	local vp = Instance.new("ViewportFrame")
	vp.Size = size
	vp.BackgroundTransparency = if o.bg then 0 else 1
	vp.BackgroundColor3 = o.bg or Color3.new()
	vp.Ambient = Color3.fromRGB(150, 155, 175)
	vp.LightColor = Color3.fromRGB(255, 250, 240)
	vp.LightDirection = Vector3.new(-0.4, -1, -0.6)
	local model = build(modelId, color, o.flame)
	model:PivotTo(CFrame.Angles(0, 0, math.rad(o.tilt or 12)))
	model.Parent = vp
	local cam = Instance.new("Camera")
	cam.FieldOfView = 30
	local _, extents = model:GetBoundingBox()
	local dist = math.max(extents.X, extents.Y * 2.2) * 1.9
	cam.CFrame = CFrame.lookAt(Vector3.new(0, dist * 0.18, dist), Vector3.zero)
	cam.Parent = vp
	vp.CurrentCamera = cam
	return vp
end

return RocketView
