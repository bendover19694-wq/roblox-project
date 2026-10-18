local out = {}
for _, c in workspace:GetChildren() do
	if c.Name == "Crate" then table.insert(out, tostring(c.Position)) end
end
return #out .. " crates: " .. table.concat(out, " | ") .. " · Supplies=" .. tostring(game.ReplicatedStorage.NightState:GetAttribute("Supplies"))
