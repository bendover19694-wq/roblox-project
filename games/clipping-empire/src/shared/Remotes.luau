--!strict
-- All remotes. The server creates them; clients wait for them.
--   S to C: State(view)  Toast(text, kind)  Celebrate(kind, data)
--     Celebrate kinds: post {cash, followers, viral}, zone {index}, rebirth {clout},
--       clip {tier, isNew} (rarest clip of a batch, server-rolled)
--   C to S: Tap(count)   [RemoteEvent, batched taps; capped in GameService]
--   C to S: Act(action, arg) returns (ok, message)   [RemoteFunction; validated in GameService]
--     actions: "post", "buy" (upgrade id), "rebirth", "setting" ("reducedMotion" | "sound"), "tutorialDone", "seen" ("index")

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")

local EVENTS = { "State", "Toast", "Celebrate", "Tap" }

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
	Tap = folder:WaitForChild("Tap") :: RemoteEvent,
	Act = folder:WaitForChild("Act") :: RemoteFunction,
}
