--!strict
-- Per-night counters shared by the night's services. Reset at the start of each night.

local NightStats = {}

export type PlayerStats = {
	correct: number,
	wrong: number,
	crates: number,
	nets: number,
	wrongThisTide: number,
}

NightStats.crewCorrect = 0
NightStats.supplies = 0
NightStats.players = {} :: { [Player]: PlayerStats }
NightStats.state = nil :: Folder?

function NightStats.reset(state: Folder)
	NightStats.state = state
	NightStats.crewCorrect = 0
	NightStats.players = {}
	NightStats.setSupplies(0)
end

function NightStats.of(player: Player): PlayerStats
	local s = NightStats.players[player]
	if not s then
		s = { correct = 0, wrong = 0, crates = 0, nets = 0, wrongThisTide = 0 }
		NightStats.players[player] = s
	end
	return s
end

function NightStats.setSupplies(n: number)
	NightStats.supplies = n
	if NightStats.state then
		NightStats.state:SetAttribute("Supplies", n)
	end
end

return NightStats
