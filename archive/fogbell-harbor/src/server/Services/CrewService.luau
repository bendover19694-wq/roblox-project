--!strict
-- Crew features: pings, tide-break upgrade votes, settings, and the grief cooldown.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Net = require(ReplicatedStorage.Shared.Net)
local Night = require(ReplicatedStorage.Shared.Config.Night)
local Remotes = require(ReplicatedStorage.Shared.Remotes)
local DataService = require(script.Parent.DataService)
local NightStats = require(script.Parent.NightStats)
local ProgressionService = require(script.Parent.ProgressionService)

local CrewService = {}

local PINGS = { Mimic = true, Real = true, Look = true, Help = true, Nice = true }
local SETTINGS = { reducedMotion = true }
local allowPing = Net.limiter(1, 3)
local allowSetting = Net.limiter(4, 4)
local cooldownUntil: { [Player]: number } = {}
local RESCUE_AFTER = 8 -- seconds in the water
local RESCUE_AT = Vector3.new(0, 7, 34)

function CrewService.init()
	Remotes.Ping.OnServerEvent:Connect(function(player, kind, pos)
		if not Net.isEnum(kind, PINGS) or not Net.isVector(pos) or not allowPing(player) then
			return
		end
		local root = player.Character and player.Character:FindFirstChild("HumanoidRootPart") :: BasePart?
		if not root or (root.Position - pos).Magnitude > 600 then
			return
		end
		Remotes.Ping:FireAllClients(kind, pos, player.DisplayName)
	end)

	Remotes.Settings.OnServerEvent:Connect(function(player, settingKey, value)
		if not Net.isEnum(settingKey, SETTINGS) or type(value) ~= "boolean" or not allowSetting(player) then
			return
		end
		local profile = DataService.peek(player)
		if profile then
			profile.settings.reducedMotion = value
		end
		player:SetAttribute("ReducedMotion", value)
	end)

	Players.PlayerRemoving:Connect(function(player)
		cooldownUntil[player] = nil
	end)

	-- Rescue: anyone stuck in the sea for a while is washed back onto the pier (ladders are the fast way).
	local wetSince: { [Player]: number } = {}
	task.spawn(function()
		while true do
			task.wait(1)
			for _, player in Players:GetPlayers() do
				local character = player.Character
				local root = character and character:FindFirstChild("HumanoidRootPart") :: BasePart?
				if root and root.Position.Y < 1 then
					wetSince[player] = wetSince[player] or os.clock()
					if os.clock() - wetSince[player] > RESCUE_AFTER then
						wetSince[player] = nil
						local model = character :: Model
						model:PivotTo(CFrame.new(RESCUE_AT))
						ProgressionService.tip(player, "rescued")
					end
				else
					wetSince[player] = nil
				end
			end
		end
	end)
end

-- Grief control: may this player use the gate/bell right now?
function CrewService.canAct(player: Player): boolean
	return os.clock() >= (cooldownUntil[player] or 0)
end

function CrewService.recordCall(player: Player, correct: boolean)
	local s = NightStats.of(player)
	if correct then
		s.correct += 1
		return
	end
	s.wrong += 1
	s.wrongThisTide += 1
	if s.wrongThisTide >= Night.griefWrongCalls then
		s.wrongThisTide = 0
		cooldownUntil[player] = os.clock() + Night.griefCooldown
		ProgressionService.tip(player, "cooldown")
	end
end

function CrewService.newTide()
	for _, s in NightStats.players do
		s.wrongThisTide = 0
	end
end

-- Tide break vote. Players stand on pads; the most-voted affordable upgrade wins (ties: lowest cost).
-- Returns the chosen upgrade or nil.
function CrewService.runVote(pads: { BasePart }, seconds: number, state: Folder): any
	ProgressionService.tipAll("upgradeVote")
	local votes = { 0, 0, 0 }
	local t0 = os.clock()
	while os.clock() - t0 < seconds do
		votes = { 0, 0, 0 }
		for _, player in Players:GetPlayers() do
			local root = player.Character and player.Character:FindFirstChild("HumanoidRootPart") :: BasePart?
			if root then
				for i, pad in pads do
					local flat = (root.Position - pad.Position) * Vector3.new(1, 0, 1)
					if flat.Magnitude < pad.Size.X / 2 + 1 then
						votes[i] += 1
					end
				end
			end
		end
		state:SetAttribute("Votes", `{votes[1]},{votes[2]},{votes[3]}`)
		task.wait(0.5)
	end
	local best, bestVotes = nil, 0
	for i, up in Night.upgrades do
		if votes[i] > bestVotes and NightStats.supplies >= up.cost then
			best, bestVotes = up, votes[i]
		end
	end
	if best then
		NightStats.setSupplies(NightStats.supplies - best.cost)
	end
	state:SetAttribute("Votes", nil)
	return best
end

return CrewService
