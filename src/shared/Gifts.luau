--!strict
-- Playtime gifts: minutes played per UTC day unlock tiers, opened in order. Pure (tests/Gifts.spec.luau).
-- State = { day, played (seconds today), next (1-based tier to open) }.

local Tuning = require(script.Parent.Config.Tuning)

export type State = { day: number, played: number, next: number }
export type Status = { next: number?, count: number, minutes: number?, reward: number?, remaining: number }

local Gifts = {}

-- Adds play time; a new day starts over. `dt` is clamped so a lag spike can't skip a tier.
function Gifts.tick(state: State, day: number, dt: number)
	if state.day ~= day then
		state.day, state.played, state.next = day, 0, 1
	end
	state.played += math.min(dt, 1)
end

function Gifts.status(state: State, day: number, stage: number): Status
	local played, nextTier = state.played, state.next
	if state.day ~= day then
		played, nextTier = 0, 1
	end
	local count = #Tuning.gifts
	local tier = Tuning.gifts[nextTier]
	if not tier then
		return { next = nil, count = count, minutes = nil, reward = nil, remaining = 0 }
	end
	return {
		next = nextTier,
		count = count,
		minutes = tier.minutes,
		reward = tier.cash * Tuning.stageRewardMult[stage],
		remaining = math.max(0, tier.minutes * 60 - played),
	}
end

-- Opens the next tier if it is ready. Returns the cash reward, or nil and why not.
function Gifts.claim(state: State, day: number, stage: number): (number?, string?)
	local s = Gifts.status(state, day, stage)
	if s.next == nil then
		return nil, "All gifts opened today"
	end
	if s.remaining > 0 then
		return nil, "Not ready yet"
	end
	if state.day ~= day then
		state.day, state.played = day, 0
	end
	state.next = s.next + 1
	return s.reward, nil
end

return Gifts
