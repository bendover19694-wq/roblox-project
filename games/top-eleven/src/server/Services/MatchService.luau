--!strict
-- Live matches: a 1 s tick advances each player's match, settles it at full time, and pushes State on change.
-- The pure rules are in Match.luau and Settle.luau; this file only wires them to players, remotes and saves.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")

local Match = require(ReplicatedStorage.Shared.Match)
local Remotes = require(ReplicatedStorage.Shared.Remotes)
local Settle = require(ReplicatedStorage.Shared.Settle)
local DataService = require(script.Parent.DataService)
local Telemetry = require(script.Parent.Telemetry)

local MatchService = {}

local function now(): number
	return workspace:GetServerTimeNow()
end

-- Settles a finished match once: Celebrate, funnel, save. Returns the result when this call paid it.
function MatchService.settle(player: Player, p: any): Settle.MatchResultT?
	local result = Settle.run(p, now())
	if result then
		Remotes.Celebrate:FireClient(player, "fullTime", result)
		Telemetry.funnel(player, 5, p)
		task.spawn(DataService.save, player)
	end
	return result
end

function MatchService.start(push: (Player) -> (), isReady: (Player) -> boolean)
	local acc = 0
	RunService.Heartbeat:Connect(function(dt)
		acc += dt
		if acc < 1 then
			return
		end
		acc = 0
		for _, player in Players:GetPlayers() do
			local p = DataService.peek(player)
			if p and p.match and not p.match.rewarded and isReady(player) then
				local ok, err = pcall(function()
					local changed = Match.advance(p.match, now())
					local paid = MatchService.settle(player, p)
					if changed or paid then
						push(player)
					end
				end)
				if not ok then
					warn("[MatchService] tick failed: ", err)
				end
			end
		end
	end)
end

return MatchService
