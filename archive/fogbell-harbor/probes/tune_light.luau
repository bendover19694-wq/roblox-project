-- Probe: dusk tuning (Server datamodel; replicates to client).
local L = game:GetService("Lighting")
L.ClockTime = 18.05
L.Brightness = 2.2
L.Ambient = Color3.fromRGB(95, 100, 115)
L.OutdoorAmbient = Color3.fromRGB(140, 140, 160)
local a = L:FindFirstChildOfClass("Atmosphere")
a.Density = 0.36
a.Offset = 0.25
a.Haze = 1.6
for _, m in workspace:GetChildren() do
	if m.Name == "Ship" then m:ScaleTo(1.5) end
end
return "ok"
