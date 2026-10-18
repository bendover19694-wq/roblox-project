--!strict
-- The rampage: a docked mimic becomes a jelly blob that chases keepers and knocks them (and their crates)
-- around until the crew nets it. Server-owned physics; net hits are validated here.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Workspace = game:GetService("Workspace")

local Net = require(ReplicatedStorage.Shared.Net)
local Night = require(ReplicatedStorage.Shared.Config.Night)
local Remotes = require(ReplicatedStorage.Shared.Remotes)
local CargoService = require(script.Parent.CargoService)
local NightStats = require(script.Parent.NightStats)
local ProgressionService = require(script.Parent.ProgressionService)

local MimicService = {}

local GREEN = Color3.fromRGB(110, 220, 120)
local NET_RANGE = 14

local blob: Part? = nil
local hits = 0
local hitters: { [Player]: boolean } = {}
local allowSwing = Net.limiter(1 / 0.6, 1)
local knocked: { [Player]: number } = {}

local function equip(player: Player, toolName: string)
	local character = player.Character
	local humanoid = character and character:FindFirstChildOfClass("Humanoid")
	local tool = player:FindFirstChild("Backpack") and (player :: any).Backpack:FindFirstChild(toolName)
	if humanoid and tool then
		humanoid:EquipTool(tool)
	end
end

local function knock(player: Player, from: Vector3)
	local root = player.Character and player.Character:FindFirstChild("HumanoidRootPart") :: BasePart?
	local humanoid = player.Character and player.Character:FindFirstChildOfClass("Humanoid")
	if not root or not humanoid or os.clock() - (knocked[player] or 0) < 1.5 then
		return
	end
	knocked[player] = os.clock()
	CargoService.knock(player)
	local away = (root.Position - from) * Vector3.new(1, 0, 1)
	away = if away.Magnitude > 0.1 then away.Unit else Vector3.new(1, 0, 0)
	humanoid.PlatformStand = true
	root.AssemblyLinearVelocity = away * 45 + Vector3.new(0, 38, 0) -- playtest: 70 flung players far out to sea
	task.delay(1.2, function()
		if humanoid.Parent then
			humanoid.PlatformStand = false
		end
	end)
end

local function nearestPlayer(from: Vector3): BasePart?
	local best, bestDist = nil, 70
	for _, p in Players:GetPlayers() do
		local root = p.Character and p.Character:FindFirstChild("HumanoidRootPart") :: BasePart?
		if root then
			local d = (root.Position - from).Magnitude
			if d < bestDist then
				best, bestDist = root, d
			end
		end
	end
	return best
end

local function finish(caught: boolean)
	local b = blob
	if not b then
		return
	end
	blob = nil
	if caught then
		for p in hitters do
			NightStats.of(p).nets += 1
			ProgressionService.funnel(p, 5)
		end
		b.AssemblyLinearVelocity = Vector3.new(-40, 60, -120) -- flung back to sea
		Remotes.Banner:FireAllClients("✔ Mimic netted and thrown back to sea!", "good")
	end
	task.delay(if caught then 2.5 else 0, function()
		b:Destroy()
	end)
	for _, p in Players:GetPlayers() do
		equip(p, "Spyglass")
	end
end

-- Starts a rampage at the dock. `onEscape` fires if the crew doesn't net it in time.
function MimicService.rampage(at: Vector3, onEscape: () -> ())
	if blob then
		blob:Destroy()
	end
	hits, hitters = 0, {}
	local b = Instance.new("Part")
	b.Name = "MimicBlob"
	b.Shape = Enum.PartType.Ball
	b.Size = Vector3.new(7, 7, 7)
	b.Color = GREEN
	b.Material = Enum.Material.Glass
	b.Position = at + Vector3.new(0, 8, 0)
	b.Parent = Workspace
	b:SetNetworkOwner(nil)
	blob = b

	local face = Instance.new("BillboardGui")
	face.Size = UDim2.fromOffset(120, 50)
	face.StudsOffset = Vector3.new(0, 1, 0)
	face.AlwaysOnTop = false
	local eyes = Instance.new("TextLabel")
	eyes.BackgroundTransparency = 1
	eyes.Size = UDim2.fromScale(1, 1)
	eyes.Text = "👀"
	eyes.TextScaled = true
	eyes.Parent = face
	face.Parent = b

	b.Touched:Connect(function(other)
		local character = other:FindFirstAncestorOfClass("Model")
		local player = character and Players:GetPlayerFromCharacter(character)
		if player then
			knock(player, b.Position)
		end
	end)

	ProgressionService.tipAll("mimicLoose")
	for _, p in Players:GetPlayers() do
		local root = p.Character and p.Character:FindFirstChild("HumanoidRootPart") :: BasePart?
		if root and (root.Position - at).Magnitude < 120 then
			equip(p, "Net") -- auto-equip: the right tool is already in hand
		end
	end

	task.spawn(function()
		local started = os.clock()
		while blob == b and os.clock() - started < Night.mimicLooseSeconds do
			local target = nearestPlayer(b.Position)
			local dir = if target then (target.Position - b.Position) * Vector3.new(1, 0, 1) else Vector3.zero
			dir = if dir.Magnitude > 0.1
				then dir.Unit
				else Vector3.new(math.random() - 0.5, 0, math.random() - 0.5)
			b.AssemblyLinearVelocity = dir * 28 + Vector3.new(0, 42, 0)
			task.wait(0.9)
		end
		if blob == b then
			Remotes.Banner:FireAllClients("✖ The mimic slipped away with some cargo!", "bad")
			finish(false)
			onEscape()
		end
	end)
end

function MimicService.init()
	Remotes.NetSwing.OnServerEvent:Connect(function(player)
		local b = blob
		if not b or not allowSwing(player) then
			return
		end
		local character = player.Character
		local root = character and character:FindFirstChild("HumanoidRootPart") :: BasePart?
		local holding = character and character:FindFirstChild("Net")
		if not root or not holding or (root.Position - b.Position).Magnitude > NET_RANGE then
			return
		end
		hits += 1
		hitters[player] = true
		b.Size = Vector3.new(7, 7, 7) * (1 - hits * 0.12)
		if hits >= Night.netHitsToCatch then
			finish(true)
		end
	end)
end

return MimicService
