--!strict
-- Server entry point.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Remotes = require(ReplicatedStorage.Shared.Remotes) -- creates the RemoteEvents
local Services = script.Parent.Services
local CargoService = require(Services.CargoService)
local CrewService = require(Services.CrewService)
local DataService = require(Services.DataService)
local HarborBuilder = require(Services.HarborBuilder)
local JudgmentService = require(Services.JudgmentService)
local MimicService = require(Services.MimicService)
local NightService = require(Services.NightService)
local ProgressionService = require(Services.ProgressionService)

local state = Instance.new("Folder")
state.Name = "NightState"
state.Parent = ReplicatedStorage

local function announce(text: string, tone: string)
	Remotes.Banner:FireAllClients(text, tone)
end

DataService.start()
local harbor = HarborBuilder.build()
CargoService.init(harbor.warehouse)
CrewService.init()
MimicService.init()
JudgmentService.init(harbor, {
	announce = announce,
	canAct = CrewService.canAct,
	onDecision = function(player)
		ProgressionService.funnel(player, 3)
	end,
})

local function onPlayer(player: Player)
	task.spawn(function()
		DataService.get(player)
		ProgressionService.funnel(player, 1)
		ProgressionService.push(player)
		ProgressionService.tip(player, "ping")
	end)
	-- Auto-equip the spyglass so the first action needs no inventory step.
	player.CharacterAdded:Connect(function(character)
		local humanoid = character:WaitForChild("Humanoid") :: Humanoid
		local spyglass = player:WaitForChild("Backpack"):WaitForChild("Spyglass", 5) :: Tool?
		if spyglass then
			humanoid:EquipTool(spyglass)
		end
	end)
end
Players.PlayerAdded:Connect(onPlayer)
for _, p in Players:GetPlayers() do
	onPlayer(p)
end

task.spawn(NightService.run, state, harbor, announce)
