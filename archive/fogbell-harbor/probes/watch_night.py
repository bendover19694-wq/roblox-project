"""Background soak test: let a full night run untouched, then capture the Harbor Log at dawn.

Usage: python scripts/probes/watch_night.py <studio_id>
Polls NightState every 10 s (max 14 min), prints phase changes, screenshots Dawn, dumps script errors.
"""
import json
import subprocess
import sys
import time

S = sys.argv[1]
CLIENT = ["python", "scripts/studio_mcp.py"]


def run(*args):
    return subprocess.run(CLIENT + list(args), capture_output=True, text=True, encoding="utf-8").stdout.strip()


last = None
t0 = time.time()
while time.time() - t0 < 14 * 60:
    state = run("luau", S, "Server", "scripts/probes/night_state.luau")
    phase = next((l for l in state.splitlines() if l.startswith("Phase=")), "Phase=?")
    tide = next((l for l in state.splitlines() if l.startswith("Tide=")), "")
    integ = next((l for l in state.splitlines() if l.startswith("Integrity=")), "")
    key = phase + tide
    if key != last:
        print(f"[{int(time.time() - t0):4d}s] {phase} {tide} {integ}", flush=True)
        last = key
    if phase == "Phase=Dawn":
        time.sleep(3)
        print(run("call", "screen_capture", json.dumps({"studio_id": S, "capture_id": "dawn_log"})))
        print(run("luau", S, "Client", "scripts/probes/client_state.luau"))
        break
    time.sleep(10)

errors = run("call", "get_console_output", json.dumps({"studio_id": S}))
ours = [l for l in errors.splitlines() if ("Server." in l or "Client." in l or "Shared." in l) and "CorePackages" not in l]
print("script error lines:", len(ours))
print("\n".join(sorted(set(ours))[:20]))
