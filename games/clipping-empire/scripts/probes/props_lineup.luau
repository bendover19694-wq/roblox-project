-- Edit mode: lay every prop out in a row at Z=-300 for a screenshot. Removed by props_lineup_clear.
local f = Instance.new("Folder")
f.Name = "_Lineup"
f.Parent = workspace
local x = 0
for _, m in game.ServerStorage.Props:GetChildren() do
	local c = m:Clone()
	local size = c:GetExtentsSize()
	c:PivotTo(CFrame.new(x + size.X / 2, size.Y / 2 + 1, -300))
	c.Parent = f
	x += size.X + 6
end
return x
