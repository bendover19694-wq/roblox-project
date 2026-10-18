--!strict
-- Night state machine: Dusk → break → Midnight → break → Small hours → Dawn (Harbor Log) → Cabin → repeat.
-- Publishes everything clients need as attributes on ReplicatedStorage.NightState.

local HttpService = game:GetService("HttpService")
local Lighting = game:GetService("Lighting")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Night = require(ReplicatedStorage.Shared.Config.Night)
local Rng = require(ReplicatedStorage.Shared.Rng)
local RuleGrammar = require(ReplicatedStorage.Shared.RuleGrammar)
local Ships = require(ReplicatedStorage.Shared.Config.Ships)
local CargoService = require(script.Parent.CargoService)
local CrewService = require(script.Parent.CrewService)
local DataService = require(script.Parent.DataService)
local HarborBuilder = require(script.Parent.HarborBuilder)
local JudgmentService = require(script.Parent.JudgmentService)
local MimicService = require(script.Parent.MimicService)
local NightStats = require(script.Parent.NightStats)
local ProgressionService = require(script.Parent.ProgressionService)
local ShipService = require(script.Parent.ShipService)

local NightService = {}

local OUTCOME_TEXT = {
	realDocked = "✔ Real ship docked. Nice call!",
	mimicStopped = "✔ Mimic stopped!",
	mimicDocked = "✖ A mimic got in!",
	realTurnedAway = "✖ That ship was real. They've filed a complaint.",
}

local BASE_FOG = 0.36

-- Logbook ids for everything visible on a ship, plus the mimic itself if caught.
local function stampsFor(spec: { [string]: any }, outcome: string): { string }
	local ids = {}
	for _, attr in Ships.order do
		table.insert(ids, `{attr}:{spec[attr]}`)
	end
	if outcome == "mimicStopped" then
		table.insert(ids, "mimic:stopped")
	end
	return ids
end

function NightService.run(state: Folder, harbor: HarborBuilder.Harbor, announce: (string, string) -> ())
	local rng = Rng.new(os.time() + math.floor(os.clock() * 1000))
	local nightNumber = 0

	local function phase(name: string, seconds: number?)
		state:SetAttribute("Phase", name)
		state:SetAttribute("EndsAt", if seconds then workspace:GetServerTimeNow() + seconds else 0)
	end

	local function night()
		nightNumber += 1
		NightStats.reset(state)
		CargoService.autoDeliver = false
		local atmosphere = Lighting:FindFirstChildOfClass("Atmosphere")
		if atmosphere then
			atmosphere.Density = BASE_FOG
		end
		for _, p in Players:GetPlayers() do
			local profile = DataService.peek(p)
			if profile and profile.stats.nights >= 1 then
				ProgressionService.funnel(p, 9)
			end
			ProgressionService.tip(p, "welcome")
		end

		local integrity = Night.integrity.start
		local rules = {}
		local log = {
			checked = 0,
			correct = 0,
			mimicsStopped = 0,
			mimicsMissed = 0,
			realTurnedAway = 0,
			failed = false,
			integrity = 0,
			supplies = 0,
		}
		local function setIntegrity(v: number)
			integrity = math.clamp(v, 0, Night.integrity.max)
			state:SetAttribute("Integrity", integrity)
			if integrity < 50 then
				ProgressionService.tipAll("lowIntegrity")
			end
		end
		setIntegrity(integrity)

		for tideIndex, tide in Night.tides do
			CrewService.newTide()
			while #rules < tide.rules do
				rules = assert(RuleGrammar.addRule(rng, rules, tideIndex), "could not add a rule")
			end
			local rows = {}
			for _, r in rules do
				table.insert(rows, RuleGrammar.describe(r))
			end
			HarborBuilder.setBoard(harbor, "TONIGHT'S RULES", rows)
			state:SetAttribute("Rules", HttpService:JSONEncode(rows))
			state:SetAttribute("Tide", tideIndex)
			state:SetAttribute("TideName", tide.name)
			phase("Tide")
			announce(`{tide.name}: {#rules} rule{if #rules == 1 then "" else "s"} tonight`, "phase")
			if tideIndex == 2 then
				ProgressionService.funnelAll(6)
				ProgressionService.tipAll("tide2")
			end

			local sawMimic = false
			for i = 1, tide.ships do
				state:SetAttribute("ShipsLeft", tide.ships - i + 1)
				local forced = tideIndex == 1 and i == Night.firstMimicBy and not sawMimic
				local spec = RuleGrammar.makeShip(rng, rules, forced or rng:next() < tide.mimicChance)
				sawMimic = sawMimic or spec.mimic
				local started = os.clock()

				local result = JudgmentService.run(spec)
				log.checked += 1
				ProgressionService.funnelAll(2)
				local correct = result.outcome == "realDocked" or result.outcome == "mimicStopped"
				if result.by then
					CrewService.recordCall(result.by, correct)
					if correct then
						ProgressionService.funnel(result.by, 4)
					end
				end

				local text = OUTCOME_TEXT[result.outcome]
				local broken = RuleGrammar.brokenRule(spec, rules)
				if broken then
					text ..= `  (Rule broken: {RuleGrammar.describe(rules[broken]).text})`
				end
				announce(text, if correct then "good" else "bad")
				ProgressionService.stamp(stampsFor(spec, result.outcome))

				if correct then
					log.correct += 1
					NightStats.crewCorrect += 1
				end
				if result.outcome == "realDocked" then
					CargoService.spawn(
						rng:int(Night.cratesPerShip[1], Night.cratesPerShip[2]),
						Vector3.new(-22, 4, 22)
					)
					task.delay(4, function()
						result.model:Destroy()
					end)
				elseif result.outcome == "mimicStopped" then
					log.mimicsStopped += 1
					if result.by then
						ProgressionService.funnel(result.by, 5)
					end
				elseif result.outcome == "mimicDocked" then
					log.mimicsMissed += 1
					setIntegrity(integrity - Night.integrity.mimicDocked)
					ShipService.revealAndSink(result.model)
					MimicService.rampage(Vector3.new(-14, 4, 26), function()
						setIntegrity(integrity - Night.integrity.mimicEscaped)
					end)
				elseif result.outcome == "realTurnedAway" then
					log.realTurnedAway += 1
					setIntegrity(integrity - Night.integrity.realTurnedAway)
				end
				if integrity <= 0 then
					log.failed = true
					break
				end

				local gap = if #Players:GetPlayers() <= 1 then tide.soloGap else tide.gap
				task.wait(math.max(gap - (os.clock() - started), 2))
			end
			state:SetAttribute("ShipsLeft", 0)
			CargoService.sweep()
			if log.failed then
				announce("The harbor is overrun! Dawn comes early…", "bad")
				break
			end
			if tideIndex < #Night.tides then
				phase("Break", Night.breakSeconds)
				announce("The tide turns… vote for an upgrade on the shore pads", "phase")
				local up = CrewService.runVote(harbor.pads, Night.breakSeconds, state)
				if up then
					announce(`Upgrade: {up.name}!`, "good")
					if up.id == "lamp" and atmosphere then
						atmosphere.Density = BASE_FOG - 0.1
					elseif up.id == "pier" then
						setIntegrity(integrity + 25)
					elseif up.id == "crane" then
						CargoService.autoDeliver = true
					end
				end
			end
		end

		log.integrity = integrity
		log.supplies = NightStats.supplies
		state:SetAttribute("Log", HttpService:JSONEncode(log))
		ProgressionService.payNight(log.failed, nightNumber)
		ProgressionService.funnelAll(8)
		phase("Dawn", Night.dawnSeconds)
		task.wait(Night.dawnSeconds)
		phase("Cabin", Night.cabinSeconds)
		announce("Rest up. Next night soon.", "phase")
		task.wait(Night.cabinSeconds)
	end

	while true do
		if #Players:GetPlayers() == 0 then
			phase("Idle")
			Players.PlayerAdded:Wait()
			task.wait(3) -- let the first player load in before the first ship
		end
		night()
	end
end

return NightService
