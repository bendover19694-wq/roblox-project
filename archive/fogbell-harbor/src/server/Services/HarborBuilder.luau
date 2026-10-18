--!strict
-- Greybox harbor built in code so the prototype runs in an empty place.
-- ponytail: code-built greybox; replace with a Studio-built Workspace.Harbor in M5 (keep the named parts).

local Lighting = game:GetService("Lighting")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local StarterPack = game:GetService("StarterPack")
local Workspace = game:GetService("Workspace")

local Night = require(ReplicatedStorage.Shared.Config.Night)
local Ships = require(ReplicatedStorage.Shared.Config.Ships)

local HarborBuilder = {}

-- World positions of the ship lane.
HarborBuilder.lane = {
	spawn = Vector3.new(-34, 1.5, -420),
	buoy = Vector3.new(-34, 1.5, -60),
	dock = Vector3.new(-34, 1.5, 20),
	away = Vector3.new(-300, 1.5, -380),
}

export type Harbor = {
	model: Model,
	lever: BasePart,
	bell: BasePart,
	board: BasePart,
	buoy: BasePart,
	warehouse: BasePart,
	pads: { BasePart },
}

local function part(parent: Instance, props: { [string]: any }): BasePart
	local p: BasePart = Instance.new(props.ClassName or "Part") :: any
	props.ClassName = nil
	p.Anchored = true
	p.TopSurface = Enum.SurfaceType.Smooth
	p.BottomSurface = Enum.SurfaceType.Smooth
	for k, v in props do
		(p :: any)[k] = v
	end
	p.Parent = parent
	return p
end

local function setupLighting()
	Lighting.ClockTime = 17.8 -- dusk; Roblox sunset is steep, 18+ is already night
	Lighting.Brightness = 2.2
	Lighting.Ambient = Color3.fromRGB(95, 100, 115)
	Lighting.OutdoorAmbient = Color3.fromRGB(150, 145, 160)
	local atmosphere = Lighting:FindFirstChildOfClass("Atmosphere") or Instance.new("Atmosphere")
	-- Fog is a design tool: ships read as silhouettes far out and resolve near the buoy. Tune here.
	atmosphere.Density = 0.36
	atmosphere.Offset = 0.25
	atmosphere.Color = Color3.fromRGB(196, 205, 214)
	atmosphere.Decay = Color3.fromRGB(92, 106, 121)
	atmosphere.Glare = 0
	atmosphere.Haze = 1.6
	atmosphere.Parent = Lighting
end

local function makeTool(name: string, tip: string, shape: Enum.PartType, size: Vector3, color: Color3)
	if StarterPack:FindFirstChild(name) then
		return
	end
	local tool = Instance.new("Tool")
	tool.Name = name
	tool.ToolTip = tip
	tool.CanBeDropped = false
	local handle = Instance.new("Part")
	handle.Name = "Handle"
	handle.Shape = shape
	handle.Size = size
	handle.Color = color
	handle.Material = Enum.Material.Metal
	handle.CanCollide = false
	handle.Parent = tool
	tool.Grip = CFrame.Angles(0, math.rad(90), 0)
	tool.Parent = StarterPack
end

local function label(parent: BasePart, lines: string, offset: number)
	local gui = Instance.new("BillboardGui")
	gui.Name = "Label"
	gui.Size = UDim2.fromOffset(220, 70)
	gui.StudsOffset = Vector3.new(0, offset, 0)
	gui.MaxDistance = 90
	local t = Instance.new("TextLabel")
	t.BackgroundTransparency = 1
	t.Size = UDim2.fromScale(1, 1)
	t.TextScaled = true
	t.RichText = true
	t.FontFace = Font.new("rbxasset://fonts/families/BuilderSans.json", Enum.FontWeight.Bold)
	t.TextColor3 = Color3.new(1, 1, 1)
	t.TextStrokeTransparency = 0.4
	t.Text = lines
	t.Parent = gui
	gui.Parent = parent
end

local function prompt(parent: BasePart, action: string, object: string)
	local p = Instance.new("ProximityPrompt")
	p.ActionText = action
	p.ObjectText = object
	p.HoldDuration = 1
	p.MaxActivationDistance = 12
	p.RequiresLineOfSight = false
	p.Parent = parent
end

function HarborBuilder.build(): Harbor
	setupLighting()
	makeTool(
		"Spyglass",
		"Zoom in on ships",
		Enum.PartType.Cylinder,
		Vector3.new(2, 0.5, 0.5),
		Color3.fromRGB(201, 165, 74)
	)
	makeTool(
		"Net",
		"Swing at a loose mimic",
		Enum.PartType.Block,
		Vector3.new(0.3, 0.3, 4),
		Color3.fromRGB(122, 92, 64)
	)

	local terrain = Workspace.Terrain
	terrain:FillBlock(CFrame.new(0, -24, -150), Vector3.new(1024, 8, 1024), Enum.Material.Sand)
	terrain:FillBlock(CFrame.new(0, -10, -150), Vector3.new(1024, 20, 1024), Enum.Material.Water)
	terrain.WaterColor = Color3.fromRGB(38, 70, 92)

	local model = Instance.new("Model")
	model.Name = "Harbor"
	model.Parent = Workspace

	local wood = Color3.fromRGB(122, 92, 64)
	part(model, {
		Name = "Land",
		Size = Vector3.new(260, 12, 120),
		Position = Vector3.new(0, -2, 140),
		Color = Color3.fromRGB(86, 110, 72),
		Material = Enum.Material.Grass,
	})
	part(model, {
		Name = "Pier",
		Size = Vector3.new(16, 1, 80),
		Position = Vector3.new(0, 3.5, 40),
		Color = wood,
		Material = Enum.Material.WoodPlanks,
	})
	part(model, {
		Name = "Jetty", -- runs to the shore so crates can be walked to the warehouse
		Size = Vector3.new(8, 1, 72),
		Position = Vector3.new(-22, 3.5, 46),
		Color = wood,
		Material = Enum.Material.WoodPlanks,
	})
	part(model, {
		Name = "Crosswalk",
		Size = Vector3.new(12, 1, 6),
		Position = Vector3.new(-12, 3.5, 30),
		Color = wood,
		Material = Enum.Material.WoodPlanks,
	})
	-- Ladders out of the water (climbable trusses on the pier and jetty sides).
	for _, at in
		{ Vector3.new(9, -1, 20), Vector3.new(-9, -1, 60), Vector3.new(9, -1, 60), Vector3.new(-27, -1, 60) }
	do
		part(model, {
			Name = "Ladder",
			ClassName = "TrussPart",
			Size = Vector3.new(2, 10, 2),
			Position = at,
			Color = wood,
		})
	end
	for _, x in { -42, -26 } do
		part(model, {
			Name = "GatePost",
			Size = Vector3.new(2, 14, 2),
			Position = Vector3.new(x, 4, -2),
			Color = wood,
		})
	end

	local spawn = Instance.new("SpawnLocation")
	spawn.Anchored = true
	spawn.Neutral = true
	spawn.Size = Vector3.new(8, 1, 8)
	spawn.Position = Vector3.new(0, 4.1, 30)
	spawn.Transparency = 1
	spawn.CanCollide = false
	spawn.Parent = model

	local lever = part(model, {
		Name = "Lever",
		Size = Vector3.new(2, 3, 2),
		Position = Vector3.new(-6.5, 5.5, 22),
		Color = Color3.fromRGB(63, 179, 127),
	})
	part(model, {
		Name = "LeverHandle",
		Size = Vector3.new(0.5, 3, 0.5),
		Position = Vector3.new(-6.5, 8, 22),
		Color = Color3.fromRGB(201, 165, 74),
	})
	prompt(lever, "Let it dock", "Harbor Gate")

	part(
		model,
		{ Name = "BellPost", Size = Vector3.new(1, 8, 1), Position = Vector3.new(6.5, 8, 22), Color = wood }
	)
	local bell = part(model, {
		Name = "Bell",
		ClassName = "Part",
		Shape = Enum.PartType.Ball,
		Size = Vector3.new(3, 3, 3),
		Position = Vector3.new(6.5, 10.5, 22),
		Color = Color3.fromRGB(201, 165, 74),
		Material = Enum.Material.Metal,
	})
	prompt(bell, "Ring fog bell", "Fog Bell")

	local board = part(
		model,
		{ Name = "RulesBoard", Size = Vector3.new(14, 9, 0.5), Color = Color3.fromRGB(15, 27, 42) }
	)
	board.CFrame = CFrame.lookAt(Vector3.new(16, 15, 4), Vector3.new(0, 11, 24)) -- raised: the bell hid its bottom rows

	local buoy = part(model, {
		Name = "Buoy",
		Shape = Enum.PartType.Ball,
		Size = Vector3.new(3, 3, 3),
		Position = HarborBuilder.lane.buoy + Vector3.new(-7, 0, 0),
		Color = Color3.fromRGB(224, 83, 61),
		Material = Enum.Material.Neon,
	})
	local buoyLight = Instance.new("PointLight")
	buoyLight.Color = buoy.Color
	buoyLight.Range = 14
	buoyLight.Enabled = false
	buoyLight.Parent = buoy

	local tower = part(model, {
		Name = "Lighthouse",
		Shape = Enum.PartType.Cylinder,
		Size = Vector3.new(40, 12, 12),
		Color = Color3.fromRGB(236, 230, 220),
	})
	tower.CFrame = CFrame.new(46, 24, 112) * CFrame.Angles(0, 0, math.rad(90))
	local lamp = part(model, {
		Name = "Lamp",
		Shape = Enum.PartType.Ball,
		Size = Vector3.new(6, 6, 6),
		Position = Vector3.new(46, 46, 112),
		Color = Color3.fromRGB(255, 220, 140),
		Material = Enum.Material.Neon,
	})
	local lampLight = Instance.new("SpotLight")
	lampLight.Range = 60
	lampLight.Brightness = 4
	lampLight.Face = Enum.NormalId.Front
	lampLight.Parent = lamp

	-- Warehouse on the shore: deliver crates here.
	local warehouse = part(model, {
		Name = "Warehouse",
		Size = Vector3.new(26, 14, 16),
		Position = Vector3.new(-30, 11, 100),
		Color = Color3.fromRGB(150, 98, 70),
		Material = Enum.Material.WoodPlanks,
	})
	label(warehouse, '📦 WAREHOUSE<br/><font size="18">Deliver crates for Supplies</font>', 10)

	-- Tide-break upgrade pads on the shore by the pier.
	local pads = {}
	for i, up in Night.upgrades do
		local pad = part(model, {
			Name = `Pad{i}`,
			Size = Vector3.new(10, 0.6, 10),
			Position = Vector3.new(-16 + (i - 1) * 16, 4.3, 92),
			Color = Color3.fromRGB(201, 165, 74),
			Material = Enum.Material.Neon,
			Transparency = 0.35,
			CanCollide = false,
		})
		label(pad, `{up.name}<br/><font size="16">{up.text} · {up.cost} Supplies</font>`, 4)
		table.insert(pads, pad)
	end

	return {
		model = model,
		lever = lever,
		bell = bell,
		board = board,
		buoy = buoy,
		warehouse = warehouse,
		pads = pads,
	}
end

local function rgb(name: string): Color3
	local c = Ships.rgb[name]
	return Color3.fromRGB(c[1], c[2], c[3])
end

-- Diegetic Rules Board. `rows` come from RuleGrammar.describe.
function HarborBuilder.setBoard(
	harbor: Harbor,
	title: string,
	rows: { { text: string, ok: boolean, color: string? } }
)
	local old = harbor.board:FindFirstChild("Board")
	if old then
		old:Destroy()
	end
	local gui = Instance.new("SurfaceGui")
	gui.Name = "Board"
	gui.Face = Enum.NormalId.Front
	gui.SizingMode = Enum.SurfaceGuiSizingMode.PixelsPerStud
	gui.PixelsPerStud = 40
	gui.LightInfluence = 0
	gui.Parent = harbor.board

	local list = Instance.new("UIListLayout")
	list.Padding = UDim.new(0, 12)
	list.HorizontalAlignment = Enum.HorizontalAlignment.Center
	list.Parent = gui
	local pad = Instance.new("UIPadding")
	pad.PaddingTop = UDim.new(0, 18)
	pad.Parent = gui

	local function line(text: string, color: Color3, height: number)
		local t = Instance.new("TextLabel")
		t.BackgroundTransparency = 1
		t.Size = UDim2.new(1, -40, 0, height)
		t.FontFace = Font.new("rbxasset://fonts/families/BuilderSans.json", Enum.FontWeight.Bold)
		t.TextScaled = true
		t.TextColor3 = color
		t.Text = text
		t.Parent = gui
		return t
	end

	line(title, Color3.fromRGB(201, 165, 74), 56)
	for _, row in rows do
		local mark = if row.ok then "✔" else "✖"
		local t = line(
			`{mark}  {row.text}`,
			if row.ok then Color3.fromRGB(63, 179, 127) else Color3.fromRGB(224, 83, 61),
			64
		)
		if row.color then
			local swatch = Instance.new("Frame")
			swatch.Size = UDim2.fromOffset(44, 44)
			swatch.Position = UDim2.new(0, -52, 0.5, -22)
			swatch.BackgroundColor3 = rgb(row.color)
			swatch.Parent = t
		end
	end
end

function HarborBuilder.flashBuoy(harbor: Harbor)
	local light = harbor.buoy:FindFirstChildOfClass("PointLight") :: PointLight
	light.Enabled = true
	task.delay(1.5, function()
		light.Enabled = false
	end)
end

return HarborBuilder
