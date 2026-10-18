--!strict
-- Research lab: three upgrade tracks bought with cash. Pure (tested in tests/Research.spec.luau).

local Tuning = require(script.Parent.Config.Tuning)

export type Effects = { speedMult: number, fuelMult: number, demandMult: number }

local Research = {}

function Research.track(id: string): any
	for _, t in Tuning.research.tracks do
		if t.id == id then
			return t
		end
	end
	return nil
end

-- Price of the upgrade that takes `level` to `level + 1`, rounded to the nearest $1K.
function Research.cost(id: string, level: number): number
	local t = Research.track(id)
	return math.floor(t.base * t.growth ^ level / 1000 + 0.5) * 1000
end

local function level(levels: any?, id: string): number
	local n = if type(levels) == "table" then levels[id] else nil
	return if type(n) == "number" then n else 0
end

function Research.effects(levels: any?): Effects
	local function step(id: string): number
		return (Research.track(id) :: any).step * level(levels, id)
	end
	return {
		speedMult = 1 + step("engines"),
		fuelMult = 1 - step("efficiency"),
		demandMult = 1 + step("comfort"),
	}
end

-- Returns the cost when the upgrade can be bought, else nil and the reason.
function Research.check(levels: any?, id: string, stage: number, cash: number): (number?, string?)
	if Research.track(id) == nil then
		return nil, "Unknown track"
	end
	if stage < Tuning.research.unlockStage then
		return nil, `Unlocks at stage {Tuning.research.unlockStage}`
	end
	local lv = level(levels, id)
	if lv >= Tuning.research.maxLevel then
		return nil, "Max level"
	end
	local cost = Research.cost(id, lv)
	if cash < cost then
		return nil, "Not enough cash"
	end
	return cost, nil
end

return Research
