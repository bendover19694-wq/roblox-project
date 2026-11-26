-- Client: lists visible HUD text that renders under 12 px or does not fit its box.
-- TextBounds are pre-UIScale, so multiply by the HUD scale for real pixels.
local h = game.Players.LocalPlayer.PlayerGui:FindFirstChild("ClipHud")
if not h then
	return "no hud"
end
local scale = h:GetAttribute("UiScale") or 1
local small, clipped = {}, {}
local function visible(g)
	while g and g:IsA("GuiObject") do
		if not g.Visible then
			return false
		end
		g = g.Parent
	end
	return true
end
for _, d in h:GetDescendants() do
	if d:IsA("TextLabel") and d.Text ~= "" and visible(d) then
		local lines = select(2, d.Text:gsub("\n", "")) + 1
		local px = d.TextBounds.Y / lines * scale
		if px < 11.5 then
			table.insert(small, string.format("%s(%.1f)", d.Text:sub(1, 16), px))
		end
		if not d.TextFits then
			table.insert(clipped, d.Text:sub(1, 20))
		end
	end
end
return string.format("hud=%s scale=%.3f small=%d [%s] clipped=%d [%s]", tostring(h.AbsoluteSize), scale, #small, table.concat(small, "; "), #clipped, table.concat(clipped, "; "))
