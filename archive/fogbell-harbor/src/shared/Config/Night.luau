--!strict
-- Night pacing. All values are playtest hypotheses (docs/game-design-document.md §2).

return {
	maxPlayers = 6,
	approachSeconds = 15, -- fog line to last buoy
	dockSeconds = 6, -- last buoy to pier
	tides = {
		{ name = "Dusk", ships = 4, gap = 25, soloGap = 35, mimicChance = 0.30, rules = 1 },
		{ name = "Midnight", ships = 5, gap = 20, soloGap = 30, mimicChance = 0.35, rules = 2 },
		{ name = "Small hours", ships = 6, gap = 15, soloGap = 25, mimicChance = 0.40, rules = 3 },
	},
	firstMimicBy = 3, -- tide 1 always has a mimic within this many ships
	breakSeconds = 20,
	dawnSeconds = 12,
	cabinSeconds = 30,
	integrity = { start = 100, max = 125, mimicDocked = 25, realTurnedAway = 5, mimicEscaped = 10 },
	cratesPerShip = { 2, 3 },
	minCarrySeconds = 2, -- anti-teleport: a crate can't reach the warehouse faster than this
	mimicLooseSeconds = 30,
	netHitsToCatch = 3,
	griefWrongCalls = 4, -- wrong calls in one tide before a cooldown
	griefCooldown = 20,
	-- Tide-break upgrades, paid from the crew's Supplies.
	upgrades = {
		{ id = "lamp", name = "Brighter Lamp", cost = 3, text = "Thinner fog for the rest of the night" },
		{ id = "pier", name = "Sturdy Pier", cost = 4, text = "+25 harbor" },
		{ id = "crane", name = "Fast Crane", cost = 4, text = "Crates carry themselves" },
	},
}
