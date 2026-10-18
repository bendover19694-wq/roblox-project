local p = game.Players:GetPlayers()[1]
local root = p.Character.HumanoidRootPart
local out = { "player at " .. tostring(root.Position) }
for _, d in workspace:GetDescendants() do
	if d:IsA("ProximityPrompt") then
		local at = if d.Parent:IsA("Attachment") then d.Parent.WorldPosition else d.Parent.Position
		local dist = (root.Position - at).Magnitude
		if dist < 40 then
			table.insert(out, string.format("%s/%s enabled=%s dist=%.1f max=%d", d.Parent.Parent.Name, d.Parent.Name, tostring(d.Enabled), dist, d.MaxActivationDistance))
		end
	end
end
return table.concat(out, "\n")
