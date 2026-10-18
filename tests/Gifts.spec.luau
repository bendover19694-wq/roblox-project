local Gifts = shared("Gifts")

local function fresh()
	return { day = 0, played = 0, next = 1 }
end

local function play(s, day, seconds)
	for _ = 1, seconds do
		Gifts.tick(s, day, 1)
	end
end

test("gift tiers unlock at 5, 10, 20 and 40 minutes", function()
	local s = fresh()
	play(s, 10, 299)
	local st = Gifts.status(s, 10, 1)
	assert(st.next == 1 and st.minutes == 5 and st.remaining == 1 and st.reward == 4000, "before 5m")
	assert(select(2, Gifts.claim(s, 10, 1)) == "Not ready yet", "too early")
	play(s, 10, 1)
	assert(Gifts.status(s, 10, 1).remaining == 0, "ready at 5m")
end)

test("gifts are claimed in order, scaled by stage, then run out", function()
	local s = fresh()
	play(s, 10, 40 * 60)
	local want = { 4000, 8000, 15000, 30000 }
	for i, cash in want do
		local r = Gifts.claim(s, 10, 3)
		assert(r == cash * 4, `tier {i}: {tostring(r)}`)
	end
	local r, err = Gifts.claim(s, 10, 3)
	assert(r == nil and err == "All gifts opened today", tostring(err))
	assert(Gifts.status(s, 10, 3).next == nil, "no next")
end)

test("a new day resets progress", function()
	local s = fresh()
	play(s, 10, 40 * 60)
	Gifts.claim(s, 10, 1)
	local st = Gifts.status(s, 11, 1)
	assert(st.next == 1 and st.remaining == 300, "status fresh")
	Gifts.tick(s, 11, 1)
	assert(s.day == 11 and s.played == 1 and s.next == 1, "tick reset")
	local r, err = Gifts.claim(s, 12, 1)
	assert(r == nil and err == "Not ready yet", "claim on new day")
end)

test("a long dt counts as at most one second", function()
	local s = fresh()
	Gifts.tick(s, 5, 9999)
	assert(s.played == 1, `played {s.played}`)
end)
