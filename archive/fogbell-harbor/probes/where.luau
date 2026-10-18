local p = game.Players:GetPlayers()[1]
local h = p.Character.Humanoid
local land = workspace.Harbor:FindFirstChild("Land")
return string.format("pos=%s state=%s platformStand=%s land=%s", tostring(p.Character.HumanoidRootPart.Position), tostring(h:GetState()), tostring(h.PlatformStand), land and (tostring(land.Position) .. " size " .. tostring(land.Size)) or "missing")
