local Receipts = shared("Receipts")

test("a recorded receipt is seen, so a retry never grants twice", function()
	local r = {}
	local key = Receipts.key(42, "abc")
	assert(key == "R_42_abc", key)
	assert(not Receipts.seen(r, key), "fresh receipt already seen")
	Receipts.record(r, key, 100)
	assert(Receipts.seen(r, key), "recorded receipt not seen")
end)

test("old receipts are dropped beyond the cap, newest kept", function()
	local r = {}
	for i = 1, 5 do
		Receipts.record(r, `k{i}`, i, 3)
	end
	assert(not r.k1 and not r.k2, "oldest receipts kept")
	assert(r.k3 and r.k4 and r.k5, "newest receipts dropped")
	-- the key just recorded survives even if its timestamp is the oldest
	Receipts.record(r, "late", 0, 3)
	assert(r.late, "just-recorded receipt dropped")
end)
