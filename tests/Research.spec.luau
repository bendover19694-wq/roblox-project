local Research = shared("Research")

test("research cost grows with level and rounds to $1K", function()
	for _, id in { "engines", "efficiency", "comfort" } do
		local prev = 0
		for lv = 0, 4 do
			local c = Research.cost(id, lv)
			assert(c > prev and c % 1000 == 0, `{id} L{lv} {c}`)
			prev = c
		end
	end
	assert(Research.cost("engines", 0) == 80000, "base")
end)

test("research effects: level 0 is neutral, levels scale, nil is safe", function()
	local e = Research.effects(nil)
	assert(e.speedMult == 1 and e.fuelMult == 1 and e.demandMult == 1, "nil")
	e = Research.effects({ engines = 0, efficiency = 0, comfort = 0 })
	assert(e.speedMult == 1 and e.fuelMult == 1 and e.demandMult == 1, "level 0")
	e = Research.effects({ engines = 5, efficiency = 5, comfort = 5 })
	assert(math.abs(e.speedMult - 1.3) < 1e-9, "speed")
	assert(math.abs(e.fuelMult - 0.6) < 1e-9, "fuel")
	assert(math.abs(e.demandMult - 1.2) < 1e-9, "demand")
end)

test("research check returns every error and the cost on success", function()
	local lv = { engines = 0, efficiency = 0, comfort = 5 }
	local _, e = Research.check(lv, "warp", 3, 1e9)
	assert(e == "Unknown track", tostring(e))
	_, e = Research.check(lv, "engines", 1, 1e9)
	assert(e == "Unlocks at stage 2", tostring(e))
	_, e = Research.check(lv, "comfort", 3, 1e9)
	assert(e == "Max level", tostring(e))
	_, e = Research.check(lv, "engines", 2, 100)
	assert(e == "Not enough cash", tostring(e))
	local cost, err = Research.check(lv, "engines", 2, 1e9)
	assert(cost == 80000 and err == nil, "success")
end)
