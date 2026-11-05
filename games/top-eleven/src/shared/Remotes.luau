--!strict
-- Copied from src/shared/Remotes.luau @ 5c33f2c (comment re-written for Top Eleven; same remote shapes)
-- All remotes in one place. The server creates them; clients wait for them.
--   S to C: State(view), Toast(text, kind), Celebrate(kind, data), Welcome(summary)
--     Celebrate kinds: fullTime MatchResultT, scout {player}, trained {playerId, stat, from, to},
--       season {division, place, outcome, prize}, upgrade {facility, level}
--   C to S: Act(action, ...) returns (ok, message)   [RemoteFunction; every action validated in Actions.luau]
--   C to S: Device(class) once per join: "phone" | "tablet" | "pc" | "console". Telemetry only.

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")

local EVENTS = { "State", "Toast", "Celebrate", "Welcome", "Device" }

local folder: Folder
if RunService:IsServer() then
	folder = Instance.new("Folder")
	folder.Name = "Remotes"
	for _, name in EVENTS do
		local e = Instance.new("RemoteEvent")
		e.Name = name
		e.Parent = folder
	end
	local act = Instance.new("RemoteFunction")
	act.Name = "Act"
	act.Parent = folder
	folder.Parent = ReplicatedStorage
else
	folder = ReplicatedStorage:WaitForChild("Remotes") :: Folder
end

return {
	State = folder:WaitForChild("State") :: RemoteEvent,
	Toast = folder:WaitForChild("Toast") :: RemoteEvent,
	Celebrate = folder:WaitForChild("Celebrate") :: RemoteEvent,
	Welcome = folder:WaitForChild("Welcome") :: RemoteEvent,
	Device = folder:WaitForChild("Device") :: RemoteEvent,
	Act = folder:WaitForChild("Act") :: RemoteFunction,
}
