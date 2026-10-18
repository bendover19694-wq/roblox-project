-- Probe (Client datamodel): what the player sees and holds.
local p = game:GetService("Players").LocalPlayer
local out = {}
local hud = p.PlayerGui:FindFirstChild("Hud")
table.insert(out, "Hud: " .. tostring(hud ~= nil))
if hud then
	for _, d in hud:GetDescendants() do
		if d:IsA("TextLabel") and d.Text ~= "" and d.Visible then table.insert(out, "  " .. d.Text:sub(1, 90)) end
	end
end
local tools = {}
for _, t in p.Backpack:GetChildren() do table.insert(tools, t.Name) end
local held = p.Character and p.Character:FindFirstChildOfClass("Tool")
table.insert(out, "Backpack: " .. table.concat(tools, ",") .. " | holding: " .. (held and held.Name or "nothing"))
table.insert(out, "ReducedMotion attr: " .. tostring(p:GetAttribute("ReducedMotion")) .. " CanSave: " .. tostring(p:GetAttribute("CanSave")))
return table.concat(out, "\n")
