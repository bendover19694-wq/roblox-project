-- Probe: report night state and live ships (run in Server datamodel).
local rs = game:GetService("ReplicatedStorage")
local st = rs:FindFirstChild("NightState")
if not st then return "no NightState" end
local out = {}
for k, v in st:GetAttributes() do table.insert(out, k .. "=" .. tostring(v)) end
local ships = 0
for _, m in workspace:GetChildren() do if m.Name == "Ship" then ships += 1 end end
table.insert(out, "ships=" .. ships)
table.insert(out, "players=" .. #game:GetService("Players"):GetPlayers())
return table.concat(out, "\n")
