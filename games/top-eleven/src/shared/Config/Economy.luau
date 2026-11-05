--!strict
-- Money numbers. PROVISIONAL: the economy role owns these and replaces them after its time-to-upgrade simulation.

local Economy = {}

Economy.divisionMult = { [5] = 1, [4] = 1.6, [3] = 2.5, [2] = 4, [1] = 6 }
Economy.reward = { win = 120, draw = 60, loss = 30, perGoal = 10 }
Economy.gate = { base = 40, levelExp = 1.4, perFan = 0.05 }
Economy.fans = { win = 10, draw = 3, loss = 0, divisionBonus = 0.25, promotion = 50 }
Economy.offline = { capHours = 8, gatePerHour = 1.5 }
Economy.prizeBase = { [5] = 300, [4] = 700, [3] = 1500, [2] = 3200, [1] = 7000 }
Economy.placeMult = { 3, 2, 1.4, 1, 0.7, 0.5 }
Economy.value = {
	base = 20,
	growth = 1.085,
	youthPotential = 1.0,
	olderPotential = 0.3,
	youthAge = 21,
	agingStart = 30,
	agingPerYear = 0.08,
	min = 20,
}
Economy.facility = {
	stadium = { base = 550, growth = 2.4 },
	training = { base = 300, growth = 1.9 },
	academy = { base = 350, growth = 2.0 },
}
Economy.targets = {
	{ minMinutes = 2, maxMinutes = 6 },
	{ minMinutes = 6, maxMinutes = 15 },
	{ minMinutes = 8, maxMinutes = 22 },
}

return Economy
