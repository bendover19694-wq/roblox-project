-- Edit mode: strip scripts from inserted props and report their size and part count.
local out = {}
for _, m in game.ServerStorage.Props:GetChildren() do
	local scripts = 0
	local parts = 0
	for _, d in m:GetDescendants() do
		if d:IsA("LuaSourceContainer") then
			scripts += 1
			d:Destroy()
		elseif d:IsA("BasePart") then
			parts += 1
		end
	end
	local size = Vector3.zero
	if m:IsA("Model") then
		size = m:GetExtentsSize()
	end
	table.insert(out, string.format("%s parts=%d scriptsRemoved=%d size=%.1f,%.1f,%.1f", m.Name, parts, scripts, size.X, size.Y, size.Z))
end
return table.concat(out, " | ")
