--!strict
-- AnalyticsService wrapper. Server-only; every call is pcall'd so analytics can never break gameplay.
-- Funnel steps (docs/launch-liveops-and-metrics.md §4): logged once per player, in order.

local AnalyticsService = game:GetService("AnalyticsService")

local Telemetry = {}

Telemetry.FUNNEL = {
	"Joined",
	"Saw first ship judged",
	"First decision",
	"First correct call",
	"First mimic stopped",
	"Reached tide 2",
	"First crate delivered",
	"Reached dawn",
	"Started second night",
}

-- `progress` is the player's saved funnel step (DataService profile field), passed in to avoid a cycle.
function Telemetry.funnel(player: Player, step: number, progress: { funnel: number })
	if progress.funnel >= step then
		return
	end
	progress.funnel = step
	pcall(function()
		AnalyticsService:LogOnboardingFunnelStepEvent(player, step, Telemetry.FUNNEL[step])
	end)
end

function Telemetry.economy(
	player: Player,
	source: boolean,
	currency: string,
	amount: number,
	balance: number,
	kind: string
)
	if amount <= 0 then
		return
	end
	pcall(function()
		local flow = if source
			then Enum.AnalyticsEconomyFlowType.Source
			else Enum.AnalyticsEconomyFlowType.Sink
		AnalyticsService:LogEconomyEvent(player, flow, currency, amount, balance, kind)
	end)
end

function Telemetry.night(player: Player, status: Enum.AnalyticsProgressionType, nightNumber: number)
	pcall(function()
		AnalyticsService:LogProgressionEvent(player, "Nights", status, nightNumber)
	end)
end

function Telemetry.custom(player: Player, name: string, value: number?)
	pcall(function()
		AnalyticsService:LogCustomEvent(player, name, value or 1)
	end)
end

return Telemetry
