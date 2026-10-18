local out = {}
for _, d in workspace:GetDescendants() do
	if d:IsA("ProximityPrompt") then
		table.insert(out, d:GetFullName() .. " enabled=" .. tostring(d.Enabled) .. " hold=" .. d.HoldDuration .. " key=" .. tostring(d.KeyboardKeyCode) .. " excl=" .. tostring(d.Exclusivity))
	end
end
local cam = workspace.CurrentCamera
local _, onScreen = cam:WorldToViewportPoint(workspace.Harbor.Warehouse.Door.WorldPosition)
table.insert(out, "door on screen: " .. tostring(onScreen) .. " camera at " .. tostring(cam.CFrame.Position))
return table.concat(out, "\n")
