-- Wait (max 50s) until a ship has just spawned (far out), so there is time to act.
local t0 = os.clock()
while os.clock() - t0 < 50 do
	for _, m in workspace:GetChildren() do
		if m.Name == "Ship" and m.PrimaryPart and m.PrimaryPart.Position.Z < -330 then
			return "new ship at z=" .. math.floor(m.PrimaryPart.Position.Z)
		end
	end
	task.wait(0.2)
end
return "timeout"
