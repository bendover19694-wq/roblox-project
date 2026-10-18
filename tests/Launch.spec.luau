local Launch = shared("Launch")

test("launch window sits after the countdown", function()
	local o, c = Launch.window(100)
	assert(math.abs(o - 102.6) < 1e-9 and math.abs(c - 103.1) < 1e-9, `{o} {c}`)
end)

test("launch judge honours both edges and the grace", function()
	assert(not Launch.judge(102.5, 100), "too early")
	assert(Launch.judge(102.6, 100), "opens")
	assert(Launch.judge(103.1, 100), "closes")
	assert(Launch.judge(103.35, 100), "inside grace")
	assert(not Launch.judge(103.45, 100), "after grace")
end)
