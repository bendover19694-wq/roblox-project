--!strict
-- Builds ship models from a ShipSpec out of primitives, and moves them along the lane.
-- SECURITY: the spec's `mimic` flag stays on the server. Models carry only visible parts.

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TweenService = game:GetService("TweenService")
local Workspace = game:GetService("Workspace")

local Ships = require(ReplicatedStorage.Shared.Config.Ships)

local ShipService = {}

local MIMIC_GREEN = Color3.fromRGB(110, 220, 120)
local SCALE = 1.5 -- playtest 2026-10-17: unscaled flags were too small to read at 200 studs

local function rgb(name: string): Color3
	local c = Ships.rgb[name]
	return Color3.fromRGB(c[1], c[2], c[3])
end

-- Adds a part welded to the root at a local offset.
local function add(
	model: Model,
	root: BasePart,
	class: string,
	size: Vector3,
	offset: CFrame,
	color: Color3,
	material: Enum.Material?
): any -- Part or WedgePart; callers may set Shape
	local p: BasePart = Instance.new(class) :: any
	p.Size = size
	p.Color = color
	p.Material = material or Enum.Material.SmoothPlastic
	p.Anchored = false
	p.CanCollide = false
	p.Massless = true
	p.CFrame = root.CFrame * offset
	local weld = Instance.new("WeldConstraint")
	weld.Part0 = root
	weld.Part1 = p
	weld.Parent = p
	p.Parent = model
	return p
end

local function addFlagPattern(model: Model, root: BasePart, flagOffset: CFrame, color: string)
	local ink = if color == "black" then Color3.new(1, 1, 1) else Color3.fromRGB(20, 20, 24)
	local front = flagOffset * CFrame.new(0, 0, -0.2)
	local pattern = Ships.pattern[color]
	if pattern == "stripe" then
		add(model, root, "Part", Vector3.new(5, 0.8, 0.1), front, ink)
	elseif pattern == "cross" then
		add(model, root, "Part", Vector3.new(5, 0.6, 0.1), front, ink)
		add(model, root, "Part", Vector3.new(0.6, 3.2, 0.1), front, ink)
	elseif pattern == "dot" then
		add(model, root, "Part", Vector3.new(1.3, 1.3, 0.1), front, ink)
	elseif pattern == "diagonal" then
		add(model, root, "Part", Vector3.new(5.8, 0.6, 0.1), front * CFrame.Angles(0, 0, math.rad(33)), ink)
	elseif pattern == "border" then
		add(model, root, "Part", Vector3.new(5, 0.4, 0.1), front * CFrame.new(0, 1.4, 0), ink)
		add(model, root, "Part", Vector3.new(5, 0.4, 0.1), front * CFrame.new(0, -1.4, 0), ink)
	end
end

function ShipService.build(spec: { [string]: any }, at: CFrame): Model
	local model = Instance.new("Model")
	model.Name = "Ship"
	local root = Instance.new("Part")
	root.Name = "Root"
	root.Size = Vector3.new(1, 1, 1)
	root.Transparency = 1
	root.Anchored = true
	root.CanCollide = false
	root.CFrame = at
	root.Parent = model
	model.PrimaryPart = root

	-- Ship faces -Z (its LookVector), so the bow is at negative Z.
	add(model, root, "Part", Vector3.new(10, 4, 24), CFrame.new(0, 1, 0), rgb(spec.hull))
	add(model, root, "WedgePart", Vector3.new(10, 4, 6), CFrame.new(0, 1, -15), rgb(spec.hull))
	add(model, root, "Part", Vector3.new(0.8, 18, 0.8), CFrame.new(0, 12, -2), Color3.fromRGB(122, 92, 64))

	local sailAt = CFrame.new(0, 12, -1.2)
	local sailColor = Color3.fromRGB(236, 230, 214)
	if spec.sail == "square" then
		add(model, root, "Part", Vector3.new(9, 10, 0.4), sailAt, sailColor)
	elseif spec.sail == "triangle" then
		add(
			model,
			root,
			"WedgePart",
			Vector3.new(0.4, 10, 9),
			sailAt * CFrame.Angles(0, math.rad(90), 0),
			sailColor
		)
	else
		local disk = add(
			model,
			root,
			"Part",
			Vector3.new(0.4, 10, 10),
			sailAt * CFrame.Angles(0, math.rad(90), 0),
			sailColor
		)
		disk.Shape = Enum.PartType.Cylinder
	end

	local flagAt = CFrame.new(2.6, 19.4, -2)
	add(model, root, "Part", Vector3.new(5, 3.2, 0.3), flagAt, rgb(spec.flag))
	addFlagPattern(model, root, flagAt, spec.flag)

	local lantern = add(
		model,
		root,
		"Part",
		Vector3.new(1.4, 1.4, 1.4),
		CFrame.new(0, 5, -16),
		Color3.fromRGB(255, 214, 120),
		Enum.Material.Neon
	)
	lantern.Name = "Lantern"
	lantern.Shape = Enum.PartType.Ball
	local light = Instance.new("PointLight")
	light.Range = 18
	light.Brightness = 3
	light.Color = lantern.Color
	light.Parent = lantern

	local head = CFrame.new(0, 3, -19)
	if spec.figurehead == "fish" then
		add(model, root, "WedgePart", Vector3.new(1.4, 1.6, 3), head, Color3.fromRGB(90, 140, 170))
	elseif spec.figurehead == "bird" then
		local b = add(model, root, "Part", Vector3.new(2, 2, 2), head, Color3.fromRGB(240, 240, 240))
		b.Shape = Enum.PartType.Ball
	elseif spec.figurehead == "star" then
		add(
			model,
			root,
			"Part",
			Vector3.new(2.2, 2.2, 0.4),
			head * CFrame.Angles(0, 0, math.rad(45)),
			Color3.fromRGB(240, 196, 40),
			Enum.Material.Neon
		)
	end

	model:ScaleTo(SCALE)
	model.Parent = Workspace

	-- Lantern rhythm: N quick blinks, then a pause. Runs until the model is destroyed.
	task.spawn(function()
		while model.Parent do
			for _ = 1, spec.blinks do
				lantern.Transparency, light.Enabled = 0, true
				task.wait(0.3)
				lantern.Transparency, light.Enabled = 0.8, false
				task.wait(0.3)
			end
			task.wait(1.4)
		end
	end)
	return model
end

-- Moves the ship (via its anchored root) in a straight line, facing travel direction.
function ShipService.sail(model: Model, to: Vector3, seconds: number): Tween
	local root = model.PrimaryPart :: BasePart
	local from = root.Position
	local dir = (to - from).Unit
	local tween = TweenService:Create(
		root,
		TweenInfo.new(seconds, Enum.EasingStyle.Linear),
		{ CFrame = CFrame.lookAt(to, to + dir) }
	)
	root.CFrame = CFrame.lookAt(from, from + dir)
	tween:Play()
	return tween
end

-- Mimic reveal: the ship turns to green jelly and sinks.
function ShipService.revealAndSink(model: Model)
	for _, p in model:GetDescendants() do
		if p:IsA("BasePart") and p.Name ~= "Root" then
			p.Color = MIMIC_GREEN
			p.Material = Enum.Material.Glass
		end
	end
	local root = model.PrimaryPart :: BasePart
	TweenService:Create(
		root,
		TweenInfo.new(2, Enum.EasingStyle.Quad, Enum.EasingDirection.In),
		{ CFrame = root.CFrame - Vector3.new(0, 16, 0) }
	):Play()
	task.delay(2.2, function()
		model:Destroy()
	end)
end

return ShipService
