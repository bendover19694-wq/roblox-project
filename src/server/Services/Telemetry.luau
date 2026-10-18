--!strict
-- AnalyticsService wrapper. Server-only; every call is pcall'd so analytics can never break gameplay.
-- Funnel steps (docs/launch-liveops-and-metrics.md section 4): logged once per player, in order.

local AnalyticsService = game:GetService("AnalyticsService")

local Telemetry = {}

Telemetry.FUNNEL = {
	"Joined",
	"Named agency",
	"Planned first mission",
	"First trip completed",
	"Bought second rocket",
	"Second mission planned",
	"First goal reward",
	"Reached stage 2",
	"Returned (offline earnings)",
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

-- Frequent flows (trip income, every arrival) are summed and logged by `flush` about once a minute,
-- so a big fleet doesn't hit AnalyticsService's per-server rate limit.
local pending: { [Player]: { [string]: number } } = {}

function Telemetry.accrue(player: Player, kind: string, amount: number)
	local bucket = pending[player]
	if not bucket then
		bucket = {}
		pending[player] = bucket
	end
	bucket[kind] = (bucket[kind] or 0) + amount
end

-- Logs summed flows: positive totals as sources, negative as sinks. `balance` is the cash after them.
function Telemetry.flush(player: Player, currency: string, balance: number)
	local bucket = pending[player]
	pending[player] = nil
	if not bucket then
		return
	end
	for kind, amount in bucket do
		Telemetry.economy(player, amount > 0, currency, math.abs(amount), balance, kind)
	end
end

function Telemetry.custom(player: Player, name: string, value: number?)
	pcall(function()
		AnalyticsService:LogCustomEvent(player, name, value or 1)
	end)
end

return Telemetry
