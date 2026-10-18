local s = game.ServerScriptService.Server.Services.ShipService
local out = { "ShipService has SCALE: " .. tostring(s.Source:find("local SCALE") ~= nil) }
for _, root in { game.ReplicatedStorage.Shared, game.ServerScriptService.Server, game.StarterPlayer.StarterPlayerScripts.Client } do
	local n = 0
	for _, d in root:GetDescendants() do if d:IsA("LuaSourceContainer") then n += 1 end end
	table.insert(out, root:GetFullName() .. ": " .. n .. " scripts")
end
return table.concat(out, "\n")
