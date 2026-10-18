--!strict
-- All RemoteEvents in one place. The server creates them; clients wait for them.
--   S→C: Banner(text, tone) · Tip(text) · Profile(view) · Celebrate(title, subtitle) · Ping(kind, pos, from)
--   C→S: Ping(kind, pos) · NetSwing() · Settings(key, value)

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")

local NAMES = { "Banner", "Tip", "Profile", "Celebrate", "Ping", "NetSwing", "Settings" }

local folder: Folder
if RunService:IsServer() then
	folder = Instance.new("Folder")
	folder.Name = "Remotes"
	for _, name in NAMES do
		local e = Instance.new("RemoteEvent")
		e.Name = name
		e.Parent = folder
	end
	folder.Parent = ReplicatedStorage
else
	folder = ReplicatedStorage:WaitForChild("Remotes") :: Folder
end

local function get(name: string): RemoteEvent
	return folder:WaitForChild(name) :: RemoteEvent
end

return {
	Banner = get("Banner"),
	Tip = get("Tip"),
	Profile = get("Profile"),
	Celebrate = get("Celebrate"),
	Ping = get("Ping"),
	NetSwing = get("NetSwing"),
	Settings = get("Settings"),
}
