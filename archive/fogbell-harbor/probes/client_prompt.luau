-- Probe (Client): inspect and trigger the warehouse prompt directly.
local door = workspace.Harbor.Warehouse:FindFirstChild("Door")
if not door then return "no Door attachment on client" end
local prompt = door:FindFirstChildOfClass("ProximityPrompt")
if not prompt then return "no prompt on client" end
local shown = false
local c = game:GetService("ProximityPromptService").PromptShown:Connect(function(p) if p == prompt then shown = true end end)
local info = "enabled=" .. tostring(prompt.Enabled) .. " style=" .. tostring(prompt.Style)
prompt:InputHoldBegin()
task.wait(0.1)
prompt:InputHoldEnd()
task.wait(0.5)
c:Disconnect()
return info .. " shownDuringProbe=" .. tostring(shown)
