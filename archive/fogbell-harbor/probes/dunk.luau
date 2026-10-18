-- Probe (Client): drop the local character into the sea to test the rescue.
local c = game.Players.LocalPlayer.Character
c:PivotTo(CFrame.new(40, -6, 10))
return "dunked"
