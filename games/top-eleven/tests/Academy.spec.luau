local Academy = shared("Academy")
local Rng = shared("Rng")
local Cfg = shared("Config/Academy")

test("Academy odds sum to 100 at every level", function()
	for level = 1, 5 do
		local sum = 0
		for _, v in Academy.odds(level) do
			sum += v
		end
		assert(sum == 100, `level {level}: {sum}`)
	end
end)

test("Academy odds are truthful", function()
	local r, counts = Rng.new(77), { common = 0, rare = 0, epic = 0, legendary = 0 }
	local n = 20000
	for _ = 1, n do
		counts[Academy.roll(r, 1, false).rarity] += 1
	end
	for rarity, pct in Academy.odds(1) do
		local got = counts[rarity] / n * 100
		assert(math.abs(got - pct) <= 1.5, `{rarity}: shown {pct}, rolled {got}`)
	end
end)

test("Academy first report is a guaranteed rare, and a youngster", function()
	for seed = 1, 50 do
		local p = Academy.roll(Rng.new(seed), 1, true)
		assert(p.rarity == "rare" and p.age >= 16 and p.age <= 18 and p.id == "")
	end
end)

test("Academy recharge keeps the remainder", function()
	local a = { level = 1, charges = 0, nextAt = 100, prospects = {}, reports = 0 }
	Academy.recharge(a, 100 + Cfg.rechargeSeconds + 50)
	assert(a.charges == 2 and a.nextAt == 100 + 2 * Cfg.rechargeSeconds, `{a.charges} {a.nextAt}`)
	Academy.recharge(a, 100 + Cfg.rechargeSeconds + 50)
	assert(a.charges == 2, "recharge twice at the same time must not add more")
end)

test("Academy cap does not bank time and spending restarts the clock", function()
	local a = { level = 1, charges = 2, nextAt = 100, prospects = {}, reports = 0 }
	Academy.recharge(a, 10 ^ 9)
	assert(a.charges == Cfg.maxCharges)
	assert(Academy.spend(a, 5000))
	assert(a.charges == Cfg.maxCharges - 1 and a.nextAt == 5000 + Cfg.rechargeSeconds)
	assert(Academy.spend(a, 6000))
	assert(a.nextAt == 5000 + Cfg.rechargeSeconds, "spending below the cap must not restart the clock")
	local z = { level = 1, charges = 0, nextAt = 0, prospects = {}, reports = 0 }
	assert(not Academy.spend(z, 1))
end)

test("Academy available counts ready charges without mutating", function()
	local a = { level = 1, charges = 0, nextAt = 100, prospects = {}, reports = 0 }
	assert(Academy.available(a, 99) == 0)
	assert(Academy.available(a, 100) == 1)
	assert(a.charges == 0 and a.nextAt == 100)
end)
