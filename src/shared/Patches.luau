--!strict
-- Mission patches: a collection derived from visits and career stage (nothing extra is saved).
-- Pure (tests/Patches.spec.luau).

local Career = require(script.Parent.Config.Career)
local Destinations = require(script.Parent.Config.Destinations)

export type Patch = {
	id: string,
	kind: "dest" | "stage",
	name: string,
	code: string,
	color: Color3,
	color2: Color3?,
	earned: boolean,
}

local Patches = {}

local ORANGE = Color3.fromHex("FF6B2C")

function Patches.list(visited: { [string]: boolean }, stage: number): { Patch }
	local out: { Patch } = {}
	for _, d in Destinations.list do
		table.insert(out, {
			id = `dest:{d.id}`,
			kind = "dest",
			name = d.name,
			code = d.code,
			color = d.color,
			color2 = d.color2,
			earned = visited[d.id] == true,
		})
	end
	for n, s in Career.stages do
		table.insert(out, {
			id = `stage:{n}`,
			kind = "stage",
			name = s.name,
			code = `S{n}`,
			color = ORANGE,
			color2 = nil,
			earned = stage >= n,
		})
	end
	return out
end

-- (earned, total)
function Patches.count(list: { Patch }): (number, number)
	local n = 0
	for _, p in list do
		if p.earned then
			n += 1
		end
	end
	return n, #list
end

return Patches
