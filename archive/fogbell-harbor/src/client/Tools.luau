--!strict
-- Client side of tools. Spyglass: activate toggles zoom; unequip zooms out.
-- Net: activate asks the server for a swing (the server validates range, tool, and rate).

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TweenService = game:GetService("TweenService")

local Remotes = require(ReplicatedStorage.Shared.Remotes)

local Tools = {}

local ZOOM_FOV = 20
local hooked: { [Tool]: boolean } = setmetatable({}, { __mode = "k" }) :: any

function Tools.start()
	local player = Players.LocalPlayer
	local camera = workspace.CurrentCamera
	local normalFov = camera.FieldOfView
	local zoomed = false

	local function setZoom(on: boolean)
		zoomed = on
		TweenService:Create(camera, TweenInfo.new(0.12), { FieldOfView = if on then ZOOM_FOV else normalFov })
			:Play()
	end

	local function hook(child: Instance)
		if not child:IsA("Tool") or hooked[child] then
			return
		end
		hooked[child] = true
		if child.Name == "Spyglass" then
			child.Activated:Connect(function()
				setZoom(not zoomed)
			end)
			child.Unequipped:Connect(function()
				setZoom(false)
			end)
		elseif child.Name == "Net" then
			child.Activated:Connect(function()
				Remotes.NetSwing:FireServer()
				local handle = child:FindFirstChild("Handle") :: BasePart?
				if handle then -- tiny local swing flourish
					child.Grip = child.Grip * CFrame.Angles(math.rad(-60), 0, 0)
					task.delay(0.15, function()
						child.Grip = child.Grip * CFrame.Angles(math.rad(60), 0, 0)
					end)
				end
			end)
		end
	end

	local function watch(container: Instance)
		container.ChildAdded:Connect(hook)
		for _, c in container:GetChildren() do
			hook(c)
		end
	end

	watch(player:WaitForChild("Backpack"))
	if player.Character then
		watch(player.Character)
	end
	player.CharacterAdded:Connect(function(character)
		watch(character)
		watch(player:WaitForChild("Backpack"))
	end)
end

return Tools
