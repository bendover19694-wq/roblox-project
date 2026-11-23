"""Automated first session: tap CLIP, POST, open Upgrades, buy Tap Power, visit every panel, show two reveals.

Usage: python scripts/probes/ftue.py <studio_id> [label]
Starts Play itself (Edit mode, synced, fresh unsaved profile) and stops it at the end.
Screenshots land in captures/<label>_NN_<step>.png. Prints a state line per step and the console.
"""
import os
import sys
import time

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from mcp_session import Session  # noqa: E402

SID = sys.argv[1]
LABEL = sys.argv[2] if len(sys.argv) > 2 else "pc"
s = Session(SID)
n = 0

STATE = """
local pg = game.Players.LocalPlayer.PlayerGui
local h = pg:FindFirstChild("ClipHud")
if not h then return "no hud" end
local o = h:FindFirstChild("Objective", true)
local cash = h:FindFirstChild("Cash", true)
local bar = h:FindFirstChild("Storage", true)
local function txt(f) local t = f and f:FindFirstChildWhichIsA("TextLabel", true) return t and t.Text or "?" end
local cashV = cash and cash:FindFirstChild("Value")
return string.format("cash=%s bar=%s objective=%s scale=%s", cashV and cashV.Text or "?", txt(bar),
	(o and o.Visible) and txt(o) or "(none)", tostring(h:GetAttribute("UiScale")))
"""


TEXT = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "textsize.luau"), encoding="utf-8").read()


def step(label):
    global n
    n += 1
    print(f"[{n:02d}] {label}: {s.luau(STATE)}")
    print("      text:", s.luau(TEXT))
    print("     ", s.shot(f"{LABEL}_{n:02d}_{label}"))


print(s.call("start_stop_play", {"is_start": True}))
time.sleep(10)
step("start")
t0 = time.time()
for _ in range(12):
    s.click("Clip", 80)
print(f"  12 taps in {time.time() - t0:.1f}s")
time.sleep(1.2)
step("after_taps")
print(" ", s.click("Post", 1200))
step("after_post")
print(" ", s.click("OpenUpgrades", 900))
step("upgrades")
print(" ", s.click("BUY $", 1000))
step("bought")
print(" ", s.click("@Close", 700))
step("closed")
print(" ", s.click("OpenRebirth", 900))
step("rebirth")
print(" ", s.click("@Close", 700))
print(" ", s.click("OpenIndex", 900))
step("index")
print(" ", s.click("@Close", 700))
# Force one reveal per big tier from the server, the same remote a real roll uses.
for tier in (4, 6):
    s.luau(
        "local p = game.Players:GetPlayers()[1] "
        f"game.ReplicatedStorage.Remotes.Celebrate:FireClient(p, 'clip', {{tier = {tier}, isNew = true}})",
        "Server",
    )
    time.sleep(0.6)
    step(f"reveal_tier{tier}")
    time.sleep(2.4)
print(" ", s.click("OpenSettings", 900))
step("settings")
print(" ", s.click("@Close", 700))
# Walk to the zone 2 gate to see it locked.
print(s.call("character_navigation", {"datamodel_type": "Client", "x": 84, "y": 3, "z": 0, "speed_multiplier": 3}))
time.sleep(4)
step("gate")
console = s.call("get_console_output", {})
print("CONSOLE (tail):\n" + console[-2500:])
print(s.call("start_stop_play", {"is_start": False}))
s.close()
