-- Probe: set dusk lighting, then wait (max 45s) until a ship is 120-220 studs out.
local L = game:GetService("Lighting")
L.ClockTime = 17.8
L.Brightness = 2.2
L.OutdoorAmbient = Color3.fromRGB(150, 145, 160)
local a = L:FindFirstChildOfClass("Atmosphere")
a.Density, a.Offset, a.Haze = 0.36, 0.25, 1.6
local t0 = os.clock()
while os.clock() - t0 < 45 do
	for _, m in workspace:GetChildren() do
		if m.Name == "Ship" and m.PrimaryPart then
			local z = m.PrimaryPart.Position.Z
			if z > -220 and z < -120 then return "ship at z=" .. math.floor(z) end
		end
	end
	task.wait(0.2)
end
return "no ship in range"
