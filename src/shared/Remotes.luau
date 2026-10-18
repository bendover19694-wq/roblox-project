--!strict
-- All remotes in one place. The server creates them; clients wait for them.
--   S to C: State(view), Toast(text, kind), Celebrate(kind, data), Welcome(summary)
--     Celebrate kinds: delivered {rocket, model}, stage {name, blurb, stage, unlocks, from},
--       arrival {dest, profit}, reward {amount, source}
--   C to S: Act(action, ...) returns (ok, message)   [RemoteFunction; every action validated in
--     AgencyService and Progression]

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")

local EVENTS = { "State", "Toast", "Celebrate", "Welcome" }

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
	Act = folder:WaitForChild("Act") :: RemoteFunction,
}
