-- Client, in Play: preloads every content id the world and HUD use and reports failures.
local ContentProvider = game:GetService("ContentProvider")
local ids, seen = {}, {}
local function add(id)
	if type(id) == "string" and id ~= "" and not seen[id] then
		seen[id] = true
		table.insert(ids, id)
	end
end
for _, root in { workspace, game.Players.LocalPlayer.PlayerGui } do
	for _, d in root:GetDescendants() do
		if d:IsA("MeshPart") then
			add(d.MeshId)
			add(d.TextureID)
		elseif d:IsA("SpecialMesh") then
			add(d.MeshId)
			add(d.TextureId)
		elseif d:IsA("Decal") or d:IsA("Texture") then
			add(d.Texture)
		elseif d:IsA("ImageLabel") or d:IsA("ImageButton") then
			add(d.Image)
		elseif d:IsA("SurfaceAppearance") then
			add(d.ColorMap)
		end
	end
end
local failed = {}
ContentProvider:PreloadAsync(ids, function(id, status)
	if status ~= Enum.AssetFetchStatus.Success then
		table.insert(failed, id .. "=" .. status.Name)
	end
end)
return string.format("checked=%d failed=%d %s", #ids, #failed, table.concat(failed, ", "))
