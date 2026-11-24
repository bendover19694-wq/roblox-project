import os, sys, time
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from mcp_session import Session
s = Session(sys.argv[1])
print(s.call("start_stop_play", {"is_start": True})); time.sleep(10)
print(s.luau(open("scripts/probes/assetaudit.luau", encoding="utf-8").read()))
print(s.luau('local out = {} for _, d in game:GetDescendants() do local ok, v = pcall(function() return d.SoundId end) if ok and type(v) == "string" and v:find("203785492") then table.insert(out, d:GetFullName()) end end return "203785492 users: " .. table.concat(out, ", ")'))
print(s.call("start_stop_play", {"is_start": False})); s.close()
