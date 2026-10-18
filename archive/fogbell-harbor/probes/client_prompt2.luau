local lp = game.Players.LocalPlayer
local root = lp.Character and lp.Character:FindFirstChild("HumanoidRootPart")
local door = workspace.Harbor.Warehouse.Door
local pps = game:GetService("ProximityPromptService")
local seen = {}
local c = pps.PromptShown:Connect(function(p) table.insert(seen, p:GetFullName()) end)
-- nudge: move a stud so prompt visibility is re-evaluated
lp.Character.Humanoid:MoveTo(root.Position + Vector3.new(0, 0, 1))
task.wait(1.5)
c:Disconnect()
return string.format("client root=%s door=%s dist=%.1f pps.Enabled=%s shown=[%s]", tostring(root.Position), tostring(door.WorldPosition), (root.Position - door.WorldPosition).Magnitude, tostring(pps.Enabled), table.concat(seen, ", "))
