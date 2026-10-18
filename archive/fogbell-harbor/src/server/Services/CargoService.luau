--!strict
-- Cargo crates from docked real ships. Carry them to the warehouse for crew Supplies.
-- Server-authoritative: carrying is a weld the server makes; delivery checks carrier and minimum carry time.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TweenService = game:GetService("TweenService")
local Workspace = game:GetService("Workspace")

local Economy = require(ReplicatedStorage.Shared.Config.Economy)
local Night = require(ReplicatedStorage.Shared.Config.Night)
local NightStats = require(script.Parent.NightStats)
local ProgressionService = require(script.Parent.ProgressionService)
local Telemetry = require(script.Parent.Telemetry)

local CargoService = {}

CargoService.autoDeliver = false -- Fast Crane upgrade

local crates: { [BasePart]: { carrier: Player?, pickedAt: number } } = {}
local carrying: { [Player]: BasePart } = {}
local warehouseAt: Vector3 = Vector3.zero
local DOOR_RADIUS = 10

local function addSupplies(n: number)
	NightStats.setSupplies(NightStats.supplies + n)
end

local function drop(player: Player)
	local crate = carrying[player]
	if not crate then
		return
	end
	carrying[player] = nil
	local weld = crate:FindFirstChild("CarryWeld")
	if weld then
		weld:Destroy()
	end
	crate.CanCollide = true
	crate.Massless = false
	crates[crate].carrier = nil
	local prompt = crate:FindFirstChildOfClass("ProximityPrompt")
	if prompt then
		prompt.Enabled = true
	end
end

local function deliver(player: Player?, crate: BasePart)
	crates[crate] = nil
	crate:Destroy()
	addSupplies(Economy.supplies.perCrate)
	if player then
		carrying[player] = nil
		NightStats.of(player).crates += 1
		ProgressionService.funnel(player, 7)
		Telemetry.economy(player, true, "Supplies", Economy.supplies.perCrate, NightStats.supplies, "Crate")
	end
end

local function pickUp(player: Player, crate: BasePart)
	local info = crates[crate]
	local root = player.Character and player.Character:FindFirstChild("HumanoidRootPart") :: BasePart?
	if not info or info.carrier or carrying[player] or not root then
		return
	end
	if (root.Position - crate.Position).Magnitude > 14 then
		return
	end
	info.carrier, info.pickedAt = player, os.clock()
	carrying[player] = crate
	crate.CanCollide = false
	crate.Massless = true
	crate.CFrame = root.CFrame * CFrame.new(0, 3.2, 0)
	local weld = Instance.new("WeldConstraint")
	weld.Name = "CarryWeld"
	weld.Part0 = root
	weld.Part1 = crate
	weld.Parent = crate
	local prompt = crate:FindFirstChildOfClass("ProximityPrompt")
	if prompt then
		prompt.Enabled = false
	end
end

function CargoService.init(warehouse: BasePart)
	-- Walking a crate up to the door delivers it: no button, no prompt that must be on screen.
	-- (Playtest 2026-10-17: a deliver prompt failed whenever the camera faced away from the door.)
	local door = Instance.new("Attachment")
	door.Name = "Door"
	door.Position = Vector3.new(0, -warehouse.Size.Y / 2 + 2, -warehouse.Size.Z / 2 - 1)
	door.Parent = warehouse
	warehouseAt = door.WorldPosition
	task.spawn(function()
		while true do
			task.wait(0.25)
			for player, crate in carrying do
				local root = player.Character
					and player.Character:FindFirstChild("HumanoidRootPart") :: BasePart?
				local info = crates[crate]
				-- the minimum carry time stops teleport exploits from delivering instantly
				if
					root
					and info
					and (root.Position - warehouseAt).Magnitude < DOOR_RADIUS
					and os.clock() - info.pickedAt >= Night.minCarrySeconds
				then
					deliver(player, crate)
				end
			end
		end
	end)
	Players.PlayerRemoving:Connect(drop)
	Players.PlayerAdded:Connect(function(player)
		player.CharacterRemoving:Connect(function()
			drop(player)
		end)
	end)
end

function CargoService.spawn(count: number, at: Vector3)
	ProgressionService.tipAll("crates")
	for i = 1, count do
		local crate = Instance.new("Part")
		crate.Name = "Crate"
		crate.Size = Vector3.new(2.6, 2.6, 2.6)
		crate.Color = Color3.fromRGB(176, 134, 84)
		crate.Material = Enum.Material.WoodPlanks
		crate.Position = at + Vector3.new((i - 2) * 3.5, 4, 0)
		crate.Parent = Workspace
		crates[crate] = { carrier = nil, pickedAt = 0 }
		if CargoService.autoDeliver then
			crate.Anchored = true
			local t = TweenService:Create(
				crate,
				TweenInfo.new(4),
				{ Position = warehouseAt + Vector3.new(0, 3, 0) }
			)
			t:Play()
			t.Completed:Connect(function()
				if crates[crate] then
					deliver(nil, crate)
				end
			end)
		else
			local prompt = Instance.new("ProximityPrompt")
			prompt.ActionText = "Carry"
			prompt.ObjectText = "Cargo crate"
			prompt.HoldDuration = 0
			prompt.MaxActivationDistance = 10
			prompt.RequiresLineOfSight = false
			prompt.Parent = crate
			prompt.Triggered:Connect(function(player)
				pickUp(player, crate)
			end)
		end
	end
end

-- Tide end: crates nobody carried are collected at a discount.
function CargoService.sweep()
	local left = 0
	for crate, info in crates do
		if not info.carrier then
			left += 1
			crates[crate] = nil
			crate:Destroy()
		end
	end
	if left > 0 then
		addSupplies(math.floor(left * Economy.supplies.leftBehindShare))
	end
end

-- Mimic rampage hook: knock a crate out of someone's hands.
function CargoService.knock(player: Player)
	drop(player)
end

return CargoService
