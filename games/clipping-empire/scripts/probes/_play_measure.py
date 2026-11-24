import os, sys, time
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from mcp_session import Session
s = Session(sys.argv[1])
print(s.call("start_stop_play", {"is_start": True})); time.sleep(9)
print(s.luau(open("scripts/probes/textsize.luau", encoding="utf-8").read()))
print(s.call("start_stop_play", {"is_start": False})); s.close()
