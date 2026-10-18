--!strict
-- Runs one ship through the harbor and returns the outcome. Server-authoritative:
-- the client only triggers ProximityPrompts; distance and cooldowns are re-checked here.
--   Gate (hold 1s): "let it dock" — provisional; the bell can override it until the buoy.
--   Bell (hold 1s): turns the ship away immediately (final).
--   No decision by the buoy: the ship docks.

local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Night = require(ReplicatedStorage.Shared.Config.Night)
local HarborBuilder = require(script.Parent.HarborBuilder)
local ShipService = require(script.Parent.ShipService)

export type Outcome = "realDocked" | "mimicStopped" | "mimicDocked" | "realTurnedAway"
export type Result = { outcome: Outcome, by: Player?, model: Model }
export type Hooks = {
	announce: (text: string, tone: string) -> (),
	canAct: (player: Player) -> boolean,
	onDecision: (player: Player) -> (),
}

local JudgmentService = {}

local harbor: HarborBuilder.Harbor
local hooks: Hooks
local current: { decision: string?, by: Player?, locked: boolean }? = nil

local function near(player: Player, part: BasePart, prompt: ProximityPrompt): boolean
	local root = player.Character and player.Character:FindFirstChild("HumanoidRootPart") :: BasePart?
	return root ~= nil and (root.Position - part.Position).Magnitude <= prompt.MaxActivationDistance + 4
end

function JudgmentService.init(h: HarborBuilder.Harbor, hk: Hooks)
	harbor, hooks = h, hk
	local gate = h.lever:FindFirstChildOfClass("ProximityPrompt") :: ProximityPrompt
	local bell = h.bell:FindFirstChildOfClass("ProximityPrompt") :: ProximityPrompt

	gate.Triggered:Connect(function(player)
		local c = current
		if
			not c
			or c.locked
			or c.decision == "dock"
			or not near(player, h.lever, gate)
			or not hooks.canAct(player)
		then
			return
		end
		c.decision, c.by = "dock", player
		hooks.onDecision(player)
		hooks.announce(`{player.DisplayName} opened the gate`, "info")
	end)

	bell.Triggered:Connect(function(player)
		local c = current
		if not c or c.locked or not near(player, h.bell, bell) or not hooks.canAct(player) then
			return
		end
		c.decision, c.by, c.locked = "bell", player, true
		hooks.onDecision(player)
		hooks.announce(`🔔 {player.DisplayName} rang the fog bell!`, "info")
	end)
end

-- Yields until the ship's fate is decided. Visual cleanup continues in the background.
-- For docked ships, the model is left at the dock; the caller decides what happens next.
function JudgmentService.run(spec: { [string]: any }): Result
	local lane = HarborBuilder.lane
	local model = ShipService.build(spec, CFrame.new(lane.spawn))
	local state = { decision = nil :: string?, by = nil :: Player?, locked = false }
	current = state

	local approach = ShipService.sail(model, lane.buoy, Night.approachSeconds)
	local started = os.clock()
	while state.decision ~= "bell" and os.clock() - started < Night.approachSeconds do
		task.wait(0.1)
	end
	state.locked = true
	current = nil

	if state.decision == "bell" then
		approach:Cancel()
		if spec.mimic then
			ShipService.revealAndSink(model)
			return { outcome = "mimicStopped", by = state.by, model = model }
		end
		ShipService.sail(model, lane.away, 10)
		task.delay(10, function()
			model:Destroy()
		end)
		return { outcome = "realTurnedAway", by = state.by, model = model }
	end

	HarborBuilder.flashBuoy(harbor)
	ShipService.sail(model, lane.dock, Night.dockSeconds).Completed:Wait()
	return { outcome = if spec.mimic then "mimicDocked" else "realDocked", by = state.by, model = model }
end

return JudgmentService
