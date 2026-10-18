local want = "Break"
local st = game.ReplicatedStorage.NightState
local t0 = os.clock()
while os.clock() - t0 < 58 do
	if st:GetAttribute("Phase") == want then return "phase " .. want .. " after " .. math.floor(os.clock() - t0) .. "s" end
	task.wait(0.25)
end
return "still " .. tostring(st:GetAttribute("Phase"))
