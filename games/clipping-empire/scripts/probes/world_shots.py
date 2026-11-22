"""Edit mode: build the street temporarily, take overview shots, then remove everything it added.

Usage: python scripts/probes/world_shots.py <studio_id>. Never save the place while this runs.
Shots land in captures/world_*.png.
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from mcp_session import Session  # noqa: E402

s = Session(sys.argv[1])
print(s.luau("""
local before = {}
for _, c in game.Lighting:GetChildren() do before[c] = true end
require(game.ServerScriptService.Server.World).build()
for _, c in game.Lighting:GetChildren() do if not before[c] then c:SetAttribute("_shot", true) end end
return "built"
""", "Edit"))
SHOTS = {
    "world_street": ([-30, 22, 0], [120, 8, 0]),
    "world_setup": ([45, 12, -14], [45, 6, 14]),
    "world_gates": ([140, 40, -60], [220, 10, 0]),
    "world_tower": ([360, 30, 0], [449, 26, 0]),
}
for cid, (cam, look) in SHOTS.items():
    print(cid, s.call("screen_capture", {"capture_id": cid, "camera_position": cam, "look_at_position": look}))
print(s.luau("""
workspace.World:Destroy()
for _, c in game.Lighting:GetChildren() do if c:GetAttribute("_shot") then c:Destroy() end end
return "cleaned"
""", "Edit"))
s.close()
