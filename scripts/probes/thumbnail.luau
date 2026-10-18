--!strict
-- Builds the thumbnail scene in the Edit place (Workspace.ThumbnailScene) for a Studio MCP screen_capture.
-- Style target: the "Run an airline" thumbnail, with a blocky Roblox character in front of the vehicle and
-- a bright sky. Run again to rebuild. Delete Workspace.ThumbnailScene before publishing.
-- Camera for the capture: position (-14, 7.5, 22), look at (2, 13, -6).

local Lighting = game:GetService("Lighting")

local old = workspace:FindFirstChild("ThumbnailScene")
if old then
	old:Destroy()
end
local scene = Instance.new("Folder")
scene.Name = "ThumbnailScene"
scene.Parent = workspace

Lighting.ClockTime = 14.5
Lighting.Brightness = 3
Lighting.Ambient = Color3.fromRGB(120, 130, 150)
Lighting.OutdoorAmbient = Color3.fromRGB(150, 160, 180)
local atmo = Lighting:FindFirstChildOfClass("Atmosphere") or Instance.new("Atmosphere")
atmo.Density = 0.25
atmo.Haze = 0
atmo.Color = Color3.fromRGB(170, 210, 255)
atmo.Decay = Color3.fromRGB(110, 170, 255)
atmo.Parent = Lighting

local function part(name: string, size: Vector3, cf: CFrame, color: Color3, props: { [string]: any }?): Part
	local p = Instance.new("Part")
	p.Name = name
	p.Anchored = true
	p.Size = size
	p.CFrame = cf
	p.Color = color
	p.Material = Enum.Material.SmoothPlastic
	p.TopSurface = Enum.SurfaceType.Smooth
	p.BottomSurface = Enum.SurfaceType.Smooth
	for k, v in props or {} do
		(p :: any)[k] = v
	end
	p.Parent = scene
	return p
end

local WHITE = Color3.fromRGB(245, 246, 250)
local ORANGE = Color3.fromRGB(255, 107, 44)
local NAVY = Color3.fromRGB(27, 34, 64)
local SKIN = Color3.fromRGB(255, 204, 153)

-- Ground: grass field and a concrete launch pad
part("Grass", Vector3.new(400, 1, 400), CFrame.new(0, -0.5, 0), Color3.fromRGB(96, 178, 72), {
	Material = Enum.Material.Grass,
})
part("Pad", Vector3.new(34, 1, 34), CFrame.new(6, 0.1, -14), Color3.fromRGB(190, 192, 198), {
	Material = Enum.Material.Concrete,
})
part("PadStripe", Vector3.new(34, 0.05, 1.2), CFrame.new(6, 0.62, -14), Color3.fromRGB(255, 200, 40))

-- Rocket lifting off: body, stripes, nose cone, fins, flame and smoke
local RX, RZ, LIFT = 8, -16, 9
local body = part("RocketBody", Vector3.new(30, 7, 7), CFrame.new(RX, LIFT + 15, RZ) * CFrame.Angles(0, 0, math.rad(90)), WHITE, {
	Shape = Enum.PartType.Cylinder,
})
body.Material = Enum.Material.SmoothPlastic
for i, y in { 6, 21 } do
	part(`Stripe{i}`, Vector3.new(1.6, 7.1, 7.1), CFrame.new(RX, LIFT + y, RZ) * CFrame.Angles(0, 0, math.rad(90)), ORANGE, {
		Shape = Enum.PartType.Cylinder,
	})
end
part("Window", Vector3.new(0.6, 2.4, 2.4), CFrame.new(RX, LIFT + 24, RZ + 3.3) * CFrame.Angles(0, math.rad(90), 0), Color3.fromRGB(90, 200, 255), {
	Shape = Enum.PartType.Cylinder,
	Material = Enum.Material.Glass,
	Transparency = 0.1,
})
-- nose: stacked discs narrowing to a point
for i = 0, 7 do
	local d = 7 * (1 - i / 8)
	part(`Nose{i}`, Vector3.new(1, d, d), CFrame.new(RX, LIFT + 30.5 + i, RZ) * CFrame.Angles(0, 0, math.rad(90)), if i < 3 then WHITE else ORANGE, {
		Shape = Enum.PartType.Cylinder,
	})
end
for i = 0, 3 do
	local a = math.rad(45 + i * 90)
	local off = Vector3.new(math.cos(a), 0, math.sin(a)) * 4.6
	part(`Fin{i}`, Vector3.new(0.6, 7, 4), CFrame.new(Vector3.new(RX, LIFT + 2.5, RZ) + off) * CFrame.Angles(0, -a, 0), ORANGE)
end
-- flame: neon cones (stacked), then smoke puffs on the pad
for i = 0, 5 do
	local d = 5.5 * (1 - i / 7)
	part(`Flame{i}`, Vector3.new(1.6, d, d), CFrame.new(RX, LIFT - 1 - i * 1.5, RZ) * CFrame.Angles(0, 0, math.rad(90)), if i < 2 then Color3.fromRGB(255, 240, 160) else Color3.fromRGB(255, 150, 40), {
		Shape = Enum.PartType.Cylinder,
		Material = Enum.Material.Neon,
	})
end
local rng = Random.new(7)
for i = 1, 26 do
	local a = rng:NextNumber(0, math.pi * 2)
	local r = rng:NextNumber(3, 16)
	local s = rng:NextNumber(4, 9)
	part(`Smoke{i}`, Vector3.new(s, s, s), CFrame.new(RX + math.cos(a) * r, s * 0.35 + rng:NextNumber(0, 3), RZ + math.sin(a) * r), Color3.fromRGB(235, 236, 240), {
		Shape = Enum.PartType.Ball,
		Material = Enum.Material.SmoothPlastic,
		Transparency = rng:NextNumber(0, 0.15),
	})
end
-- launch tower
part("Tower", Vector3.new(2.5, 34, 2.5), CFrame.new(RX - 10, 17, RZ - 2), Color3.fromRGB(200, 60, 50), { Material = Enum.Material.Metal })
part("Arm", Vector3.new(6, 1.2, 1.2), CFrame.new(RX - 7, 26, RZ - 2), Color3.fromRGB(200, 60, 50), { Material = Enum.Material.Metal })

-- Blocky astronaut (classic proportions), hand shading the eyes, looking up at the launch
local CX, CZ = -4, 4
local face = CFrame.Angles(0, math.rad(-150), 0) -- turned toward the rocket, three-quarter to camera
local root = CFrame.new(CX, 0, CZ) * face
local function limb(name: string, size: Vector3, offset: CFrame, color: Color3): Part
	return part(name, size, root * offset, color)
end
limb("LeftLeg", Vector3.new(1, 2, 1), CFrame.new(-0.5, 1, 0), WHITE)
limb("RightLeg", Vector3.new(1, 2, 1), CFrame.new(0.5, 1, 0), WHITE)
limb("Boots", Vector3.new(2.05, 0.5, 1.1), CFrame.new(0, 0.25, 0), NAVY)
local torso = limb("Torso", Vector3.new(2, 2, 1), CFrame.new(0, 3, 0), WHITE)
limb("Belt", Vector3.new(2.05, 0.35, 1.05), CFrame.new(0, 2.2, 0), ORANGE)
limb("Badge", Vector3.new(0.6, 0.6, 0.1), CFrame.new(-0.5, 3.4, -0.52), ORANGE)
limb("LeftArm", Vector3.new(1, 2, 1), CFrame.new(-1.5, 3, 0), WHITE)
-- right arm raised: hand to the forehead, saluting / shading the eyes
limb("RightArm", Vector3.new(1, 2, 1), CFrame.new(1.35, 4.25, -0.35) * CFrame.Angles(math.rad(-20), 0, math.rad(125)), WHITE)
limb("Glove", Vector3.new(1.05, 0.5, 1.05), CFrame.new(0.55, 5.05, -0.55) * CFrame.Angles(math.rad(-20), 0, math.rad(125)), NAVY)
local head = limb("Head", Vector3.new(2, 1, 1), CFrame.new(0, 4.5, 0) * CFrame.Angles(math.rad(12), 0, 0), SKIN)
local mesh = Instance.new("SpecialMesh")
mesh.MeshType = Enum.MeshType.Head
mesh.Scale = Vector3.new(1.25, 1.25, 1.25)
mesh.Parent = head
local decal = Instance.new("Decal")
decal.Texture = "rbxasset://textures/face.png"
decal.Face = Enum.NormalId.Front
decal.Parent = head
limb("Hair", Vector3.new(2.1, 0.55, 1.3), CFrame.new(0, 5.2, 0.05) * CFrame.Angles(math.rad(12), 0, 0), Color3.fromRGB(120, 70, 35))
limb("Fringe", Vector3.new(1.6, 0.35, 0.3), CFrame.new(0.25, 5.0, -0.55) * CFrame.Angles(math.rad(12), 0, math.rad(-8)), Color3.fromRGB(120, 70, 35))
-- helmet tucked under the left arm
local helmet = part("Helmet", Vector3.new(1.9, 1.9, 1.9), root * CFrame.new(-2.3, 2.4, -0.4), WHITE, { Shape = Enum.PartType.Ball })
part("Visor", Vector3.new(1.2, 1.2, 0.5), helmet.CFrame * CFrame.new(0, 0.1, -0.75), Color3.fromRGB(255, 190, 60), {
	Material = Enum.Material.Glass,
	Reflectance = 0.3,
})
local _ = torso

return `built {#scene:GetChildren()} parts`
