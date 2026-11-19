--!strict
-- Builds the neon street at server start: five creator setups along X, gates, a skyline and lighting.
-- Parts and built-in materials, plus optional free Creator Store props saved in ServerStorage.Props
-- (scripts stripped, see docs/assets.md). Missing props fall back to parts, so the map always builds.

local Lighting = game:GetService("Lighting")

local Config = require(game:GetService("ReplicatedStorage").Shared.Config)

local World = {}

local Props = game:GetService("ServerStorage"):FindFirstChild("Props")

-- Clones a saved prop so its bounding-box bottom centre sits at `at`, scaled to `height` studs.
local function prop(name: string, parent: Instance, at: CFrame, height: number): Model?
	local src = Props and Props:FindFirstChild(name)
	if not (src and src:IsA("Model")) then
		return nil
	end
	local m = src:Clone()
	local _, size = m:GetBoundingBox()
	if size.Y > 0 then
		m:ScaleTo(m:GetScale() * height / size.Y)
	end
	local box, newSize = m:GetBoundingBox()
	local offset = m:GetPivot():ToObjectSpace(box)
	m:PivotTo(at * CFrame.new(0, newSize.Y / 2, 0) * offset:Inverse())
	for _, d in m:GetDescendants() do
		if d:IsA("BasePart") then
			d.Anchored = true
		end
	end
	m.Parent = parent
	return m
end

local W, D = Config.ZONE_WIDTH, Config.ZONE_DEPTH
local LENGTH = W * #Config.ZONES

local function part(parent: Instance, props: { [string]: any }): Part
	local p = Instance.new("Part")
	p.Anchored = true
	p.TopSurface = Enum.SurfaceType.Smooth
	p.BottomSurface = Enum.SurfaceType.Smooth
	p.Material = Enum.Material.SmoothPlastic
	for k, v in props do
		(p :: any)[k] = v
	end
	p.Parent = parent
	return p
end

local function label(parent: BasePart, face: Enum.NormalId, text: string, color: Color3, bg: Color3?)
	local gui = Instance.new("SurfaceGui")
	gui.Face = face
	gui.SizingMode = Enum.SurfaceGuiSizingMode.PixelsPerStud
	gui.PixelsPerStud = 20
	gui.LightInfluence = 0
	local t = Instance.new("TextLabel")
	t.Size = UDim2.fromScale(1, 1)
	t.BackgroundColor3 = bg or Color3.new(0, 0, 0)
	t.BackgroundTransparency = if bg then 0 else 1
	t.TextColor3 = color
	t.TextScaled = true
	t.Font = Enum.Font.GothamBlack
	t.Text = text
	t.Parent = gui
	gui.Parent = parent
end

local function lighting()
	Lighting.ClockTime = 19.1 -- dusk: neon reads, but buildings are still visible
	Lighting.Brightness = 2
	Lighting.Ambient = Color3.fromRGB(110, 90, 140)
	Lighting.OutdoorAmbient = Color3.fromRGB(150, 120, 180)
	Lighting.EnvironmentDiffuseScale = 0.4
	local atmos = Instance.new("Atmosphere")
	atmos.Density = 0.32
	atmos.Color = Color3.fromRGB(255, 120, 190)
	atmos.Decay = Color3.fromRGB(90, 40, 140)
	atmos.Glare = 0.4
	atmos.Haze = 1.6
	atmos.Parent = Lighting
	local bloom = Instance.new("BloomEffect")
	bloom.Intensity = 0.9
	bloom.Size = 30
	bloom.Threshold = 1.4
	bloom.Parent = Lighting
	local cc = Instance.new("ColorCorrectionEffect")
	cc.Saturation = 0.15
	cc.Contrast = 0.08
	cc.TintColor = Color3.fromRGB(255, 240, 250)
	cc.Parent = Lighting
end

-- A creator desk: desk, chair, two monitors (one live, one showing the hype trailer), ring light.
local function setup(parent: Instance, cx: number, color: Color3, tier: number)
	local desk = part(parent, {
		Name = "Desk",
		Size = Vector3.new(14, 1, 6),
		Position = Vector3.new(cx, 4, 14),
		Color = Color3.fromRGB(30, 30, 40),
	})
	for _, dx in { -6, 6 } do
		part(parent, {
			Size = Vector3.new(1, 3.5, 5),
			Position = desk.Position + Vector3.new(dx, -2.25, 0),
			Color = desk.Color,
		})
	end
	part(parent, {
		Size = Vector3.new(14, 0.2, 0.3),
		Position = desk.Position + Vector3.new(0, 0.5, -3),
		Material = Enum.Material.Neon,
		Color = color,
	})
	local screens = math.clamp(tier, 1, 3)
	for i = 1, screens do
		local x = cx + (i - (screens + 1) / 2) * 5.2
		local mon = part(parent, {
			Name = "Monitor",
			Size = Vector3.new(5, 3, 0.4),
			Position = Vector3.new(x, 6.6, 16),
			Color = Color3.fromRGB(10, 10, 14),
		})
		local text = if i == 1
			then `{Config.HYPE_GAME}\nTRAILER`
			elseif i == 2 then "LIVE  REC"
			else "CLIPS\nUPLOADING"
		label(
			mon,
			Enum.NormalId.Front,
			text,
			Color3.new(1, 1, 1),
			if i == 2 then Color3.fromRGB(200, 30, 60) else Color3.fromRGB(20, 16, 40)
		)
		part(
			parent,
			{ Size = Vector3.new(0.4, 1.6, 0.4), Position = Vector3.new(x, 5.2, 16), Color = desk.Color }
		)
	end
	-- Chair: the free gaming chair when saved, else a simple part chair.
	if not prop("Chair2", parent, CFrame.new(cx, 0.4, 9) * CFrame.Angles(0, math.pi, 0), 6) then
		part(parent, { Size = Vector3.new(3, 0.6, 3), Position = Vector3.new(cx, 2.6, 9), Color = color })
		part(parent, { Size = Vector3.new(3, 3.5, 0.6), Position = Vector3.new(cx, 4.6, 7.4), Color = color })
	end
	-- Ring light
	local ring = part(parent, {
		Shape = Enum.PartType.Cylinder,
		Size = Vector3.new(0.4, 4, 4),
		Position = Vector3.new(cx + 9, 8, 12),
		Orientation = Vector3.new(0, 90, 0),
		Material = Enum.Material.Neon,
		Color = Color3.fromRGB(255, 245, 230),
	})
	part(parent, {
		Size = Vector3.new(0.3, 6, 0.3),
		Position = ring.Position - Vector3.new(0, 4.5, 0),
		Color = desk.Color,
	})
	local light = Instance.new("PointLight")
	light.Range = 22
	light.Brightness = 1.2
	light.Color = color
	light.Parent = ring
end

local function gate(parent: Instance, index: number)
	local z = Config.ZONES[index]
	local x = (index - 1) * W
	local folder = Instance.new("Model")
	folder.Name = `Gate{index}`
	for _, side in { -1, 1 } do
		part(folder, {
			Size = Vector3.new(2, 22, 2),
			Position = Vector3.new(x, 11, side * (D / 2 - 1)),
			Material = Enum.Material.Neon,
			Color = z.color,
		})
	end
	local top = part(folder, {
		Name = "Sign",
		Size = Vector3.new(2, 6, D),
		Position = Vector3.new(x, 25, 0),
		Color = Color3.fromRGB(20, 16, 40),
	})
	label(top, Enum.NormalId.Left, `{string.upper(z.name)}  x{z.mult}`, z.color)
	label(top, Enum.NormalId.Right, `{string.upper(z.name)}  x{z.mult}`, z.color)
	-- Wall: the client makes it solid while locked for that player (server keeps it open for everyone).
	local wall = part(folder, {
		Name = "Wall",
		Size = Vector3.new(1, 22, D - 4),
		Position = Vector3.new(x, 11, 0),
		Material = Enum.Material.ForceField,
		Color = z.color,
		Transparency = 0.2,
		CanCollide = false,
	})
	wall:SetAttribute("Zone", index)
	local bb = Instance.new("BillboardGui")
	bb.Name = "Lock"
	bb.Size = UDim2.fromOffset(200, 56)
	bb.StudsOffset = Vector3.new(0, -5, 0) -- below the HUD's stat pills from the usual camera angle
	bb.AlwaysOnTop = false
	bb.MaxDistance = 60
	local t = Instance.new("TextLabel")
	t.Size = UDim2.fromScale(1, 1)
	t.BackgroundTransparency = 1
	t.TextColor3 = Color3.new(1, 1, 1)
	t.TextStrokeTransparency = 0.3
	t.TextScaled = true
	t.Font = Enum.Font.GothamBlack
	t.Text = `LOCKED\nNeed {z.followers} followers`
	t.Parent = bb
	bb.Parent = wall
	folder.Parent = parent
end

local function skyline(parent: Instance)
	local rng = Random.new(66)
	local palette = {
		Color3.fromRGB(255, 80, 170),
		Color3.fromRGB(60, 200, 255),
		Color3.fromRGB(255, 190, 60),
		Color3.fromRGB(170, 100, 255),
	}
	local posters = {
		`{Config.HYPE_GAME}\nOUT SOON`,
		"CLIP IT\nPOST IT",
		"GO VIRAL",
		`{Config.HYPE_GAME}\nTRAILER 3`,
		"1M VIEWS\nCLUB",
	}
	local n = 0
	for _, side in { -1, 1 } do
		local x = -60
		while x < LENGTH + 60 do
			local w = rng:NextInteger(18, 30)
			local h = rng:NextInteger(40, 140)
			local z = side * (D / 2 + 20 + rng:NextInteger(0, 20))
			local b = part(parent, {
				Name = "Building",
				Size = Vector3.new(w, h, 24),
				Position = Vector3.new(x + w / 2, h / 2, z),
				Color = Color3.fromRGB(
					rng:NextInteger(22, 40),
					rng:NextInteger(18, 30),
					rng:NextInteger(40, 60)
				),
				Material = Enum.Material.Concrete,
			})
			local accent = palette[rng:NextInteger(1, #palette)]
			for y = 12, h - 6, 14 do
				part(parent, {
					Size = Vector3.new(w - 4, 2, 0.4),
					Position = Vector3.new(b.Position.X, y, z - side * 12.2),
					Material = Enum.Material.Neon,
					Color = accent,
					Transparency = 0.15,
					CanCollide = false,
				})
			end
			n += 1
			if n % 3 == 0 then
				local poster = part(parent, {
					Size = Vector3.new(w - 2, 14, 0.5),
					Position = Vector3.new(b.Position.X, math.min(h - 10, 30), z - side * 12.5),
					Color = Color3.fromRGB(15, 10, 30),
					CanCollide = false,
				})
				label(
					poster,
					if side < 0 then Enum.NormalId.Back else Enum.NormalId.Front,
					posters[(n // 3 - 1) % #posters + 1],
					accent
				)
			end
			x += w + rng:NextInteger(2, 8)
		end
	end
end

local function palm(parent: Instance, pos: Vector3)
	part(parent, {
		Shape = Enum.PartType.Cylinder,
		Size = Vector3.new(16, 1.6, 1.6),
		Position = pos + Vector3.new(0, 8, 0),
		Orientation = Vector3.new(0, 0, 90),
		Color = Color3.fromRGB(110, 80, 60),
		Material = Enum.Material.Wood,
	})
	for i = 0, 5 do
		part(parent, {
			Size = Vector3.new(1, 0.4, 8),
			CFrame = CFrame.new(pos + Vector3.new(0, 16, 0))
				* CFrame.Angles(0, math.rad(i * 60), 0)
				* CFrame.Angles(math.rad(-25), 0, 0)
				* CFrame.new(0, 0, -3.5),
			Color = Color3.fromRGB(40, 170, 90),
			Material = Enum.Material.Grass,
			CanCollide = false,
		})
	end
end

function World.build()
	lighting()
	local root = Instance.new("Folder")
	root.Name = "World"

	part(root, {
		Name = "Ground",
		Size = Vector3.new(LENGTH + 400, 2, 400),
		Position = Vector3.new(LENGTH / 2, -1, 0),
		Color = Color3.fromRGB(24, 22, 32),
		Material = Enum.Material.Asphalt,
	})
	-- Lane stripes
	for x = -40, LENGTH + 40, 16 do
		part(root, {
			Size = Vector3.new(8, 0.1, 0.6),
			Position = Vector3.new(x, 0.05, -D / 2 - 8),
			Material = Enum.Material.Neon,
			Color = Color3.fromRGB(255, 220, 120),
			CanCollide = false,
		})
	end
	-- Spawn plaza behind zone 1
	part(root, {
		Name = "Plaza",
		Size = Vector3.new(40, 0.4, D),
		Position = Vector3.new(-20, 0.2, 0),
		Color = Color3.fromRGB(45, 40, 60),
	})
	local spawn = Instance.new("SpawnLocation")
	spawn.Anchored = true
	spawn.Size = Vector3.new(8, 1, 8)
	spawn.Position = Vector3.new(-12, 0.5, 0)
	spawn.Orientation = Vector3.new(0, -90, 0) -- face +X, down the street
	spawn.Neutral = true
	spawn.Duration = 0
	spawn.Material = Enum.Material.Neon
	spawn.Color = Color3.fromRGB(255, 92, 168)
	spawn.TopSurface = Enum.SurfaceType.Smooth
	spawn.Parent = root
	local end_ = part(root, {
		Name = "EndWall",
		Size = Vector3.new(2, 30, D),
		Position = Vector3.new(LENGTH + 1, 15, 0),
		Transparency = 1,
	})
	end_.CanCollide = true
	part(root, {
		Name = "BackWall",
		Size = Vector3.new(2, 30, D),
		Position = Vector3.new(-41, 15, 0),
		Transparency = 1,
	})
	for _, side in { -1, 1 } do
		part(root, {
			Name = "Rail",
			Size = Vector3.new(LENGTH + 42, 30, 2),
			Position = Vector3.new(LENGTH / 2 - 20, 15, side * (D / 2 + 1)),
			Transparency = 1,
		})
	end

	for i, z in Config.ZONES do
		local cx = (i - 1) * W + W / 2
		local zone = Instance.new("Model")
		zone.Name = `Zone{i}`
		part(zone, {
			Name = "Floor",
			Size = Vector3.new(W - 2, 0.4, D),
			Position = Vector3.new(cx, 0.2, 0),
			Color = Color3.fromRGB(34, 30, 48),
		})
		part(zone, {
			Size = Vector3.new(W - 2, 0.2, 1),
			Position = Vector3.new(cx, 0.45, D / 2 - 1),
			Material = Enum.Material.Neon,
			Color = z.color,
		})
		part(zone, {
			Size = Vector3.new(W - 2, 0.2, 1),
			Position = Vector3.new(cx, 0.45, -D / 2 + 1),
			Material = Enum.Material.Neon,
			Color = z.color,
		})
		setup(zone, cx, z.color, i)
		if i >= 3 then
			setup(zone, cx - 26, z.color, i - 1)
			setup(zone, cx + 26, z.color, i - 1)
		end
		local sign = part(zone, {
			Name = "ZoneSign",
			Size = Vector3.new(30, 8, 1),
			Position = Vector3.new(cx, 14, 24),
			Color = Color3.fromRGB(15, 10, 30),
		})
		label(sign, Enum.NormalId.Front, `{z.name}\nCLIPS PAY x{z.mult}`, z.color)
		palm(zone, Vector3.new(cx - 30, 0, -24))
		palm(zone, Vector3.new(cx + 30, 0, -24))
		zone.Parent = root
		if i >= 2 then
			gate(root, i)
		end
	end

	-- The hype screen at the end of the street.
	local screen = part(root, {
		Name = "HypeScreen",
		Size = Vector3.new(2, 40, 60),
		Position = Vector3.new(LENGTH - 2, 26, 0),
		Color = Color3.fromRGB(10, 8, 20),
	})
	label(
		screen,
		Enum.NormalId.Left,
		`{Config.HYPE_GAME}\nOFFICIAL TRAILER\nCLIP IT FIRST`,
		Color3.fromRGB(255, 200, 80),
		Color3.fromRGB(30, 10, 50)
	)

	-- Street lamps along both kerbs (free prop when saved, else a neon post).
	for x = 15, LENGTH - 10, 30 do
		for _, side in { -1, 1 } do
			local at = CFrame.new(x, 0.4, side * (D / 2 - 4))
				* CFrame.Angles(0, if side > 0 then 0 else math.pi, 0)
			local lamp = prop("Lamp2", root, at, 14)
			local top = if lamp
				then lamp:GetBoundingBox().Position + Vector3.new(0, 6, 0)
				else Vector3.new(x, 13, side * (D / 2 - 4))
			if not lamp then
				part(root, {
					Size = Vector3.new(0.6, 13, 0.6),
					Position = Vector3.new(x, 6.5, side * (D / 2 - 4)),
					Color = Color3.fromRGB(30, 30, 40),
				})
			end
			local bulb = part(root, {
				Name = "LampLight",
				Size = Vector3.new(1, 1, 1),
				Position = top,
				Transparency = 1,
				CanCollide = false,
			})
			local light = Instance.new("PointLight")
			light.Range = 24
			light.Brightness = 1.4
			light.Color = Color3.fromRGB(255, 210, 150)
			light.Parent = bulb
		end
	end

	skyline(root)
	root.Parent = workspace
end

return World
