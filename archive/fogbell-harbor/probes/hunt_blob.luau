-- Probe (Client): chase the blob and swing the net, like a player would.
local lp = game.Players.LocalPlayer
local hum = lp.Character.Humanoid
local root = lp.Character.HumanoidRootPart
local swings, t0 = 0, os.clock()
local held = lp.Character:FindFirstChildOfClass("Tool")
while os.clock() - t0 < 25 do
	local blob = workspace:FindFirstChild("MimicBlob")
	if not blob then break end
	hum:MoveTo(blob.Position)
	local tool = lp.Character:FindFirstChild("Net")
	if tool and (root.Position - blob.Position).Magnitude < 12 then
		tool:Activate()
		swings += 1
		task.wait(0.7)
	else
		task.wait(0.15)
	end
end
return string.format("held at start=%s swings=%d blob gone=%s", held and held.Name or "none", swings, tostring(workspace:FindFirstChild("MimicBlob") == nil))
