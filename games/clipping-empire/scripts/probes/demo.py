"""Record a ~70 s gameplay demo video in Play mode. Read-only: never edits or saves the place.

Usage: python scripts/probes/demo.py <studio_id>
Prints the video_capture handoff (file paths) at the end.
"""
import os
import sys
import time

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from mcp_session import Session  # noqa: E402

s = Session(sys.argv[1])
print(s.call("start_stop_play", {"is_start": True}))
time.sleep(10)
print(s.call("video_capture", {"datamodel_type": "Client", "is_start": True}))
time.sleep(2)


def taps(n, gap=60):
    for _ in range(n):
        s.click("Clip", gap)


try:
    taps(14)
    time.sleep(0.8)
    s.click("Post", 1500)
    s.click("OpenUpgrades", 1200)
    s.click("BUY $", 1500)
    s.click("@Close", 800)
    taps(14)
    s.click("Post", 1500)
    taps(14)
    s.click("Post", 1500)
    s.click("OpenUpgrades", 1000)
    s.click("BUY $", 1200)
    s.click("BUY $", 1200)
    s.click("@Close", 800)
    s.click("OpenRebirth", 2000)
    s.click("@Close", 800)
    s.call("character_navigation", {"datamodel_type": "Client", "x": 84, "y": 3, "z": 0, "speed_multiplier": 1.5})
    time.sleep(5)
finally:
    print(s.call("video_capture", {"datamodel_type": "Client", "is_start": False}))
    print(s.call("start_stop_play", {"is_start": False}))
    s.close()
