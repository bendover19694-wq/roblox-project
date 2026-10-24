--!strict
-- Tells the server once which kind of device this is, for the live-numbers board in Agent HQ.
-- Telemetry only: the server validates the value and nothing in the game depends on it.

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")

local Remotes = require(ReplicatedStorage.Shared.Remotes)

local DeviceReport = {}

local PHONE_SHORT_SIDE = 600 -- pixels; a touch screen smaller than this is a phone

local function classify(): string
	local touch = UserInputService.TouchEnabled
	local keyboard = UserInputService.KeyboardEnabled
	if touch and not keyboard then
		local camera = workspace.CurrentCamera
		if not camera then
			workspace:GetPropertyChangedSignal("CurrentCamera"):Wait()
			camera = workspace.CurrentCamera
		end
		local size = if camera then camera.ViewportSize else Vector2.new(1024, 768)
		return if math.min(size.X, size.Y) < PHONE_SHORT_SIDE then "phone" else "tablet"
	end
	if UserInputService.GamepadEnabled and not keyboard then
		return "console"
	end
	return "pc"
end

function DeviceReport.start()
	task.spawn(function()
		Remotes.Device:FireServer(classify())
	end)
end

return DeviceReport
