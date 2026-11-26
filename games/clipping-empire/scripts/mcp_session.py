"""One long-lived Studio MCP connection for probes, with retries.

Spawning StudioMCP.exe per call often finds no Studio for a while, so probes keep one process
and retry "No Roblox Studio instances are connected" replies until Studio answers.
"""
import base64
import json
import os
import subprocess
import time

BAT = os.path.expandvars(r"%LOCALAPPDATA%\Roblox\mcp.bat")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NOT_CONNECTED = "No Roblox Studio instances are connected"

# Finds a visible GUI object by exact text first, then by Name, then by text containing q.
# Returns screen coords for the MCP mouse (adjusted for the safe-area offset on phones).
FIND = """
local q = %s
local function visible(g)
	while g and g:IsA("GuiObject") do
		if not g.Visible then return false end
		g = g.Parent
	end
	return g == nil or not g:IsA("ScreenGui") or g.Enabled
end
local best, rank = nil, 99
for _, d in game.Players.LocalPlayer.PlayerGui:GetDescendants() do
	if d:IsA("GuiObject") and visible(d) and d.AbsoluteSize.X > 0 then
		local r = 99
		local text = (d:IsA("TextButton") or d:IsA("TextLabel")) and d.Text or nil
		if q:sub(1, 1) == "@" then
			-- "@Name": a LihFolk kit button, whose input surface is a TextButton "Hit" under a root called Name.
			if d:IsA("TextButton") and d.Name == "Hit" and d:FindFirstAncestor(q:sub(2)) then r = 1 end
		elseif text == q then r = 1 elseif d.Name == q and d:IsA("GuiButton") then r = 2 elseif text and text:find(q, 1, true) then r = 3 end
		if r < rank then best, rank = d, r end
	end
end
if not best then return "NOTFOUND" end
local c = best.AbsolutePosition + best.AbsoluteSize / 2
local g = Instance.new("ScreenGui")
g.ScreenInsets = Enum.ScreenInsets.None
local f = Instance.new("Frame")
f.Size = UDim2.fromScale(1, 1)
f.Parent = g
g.Parent = game.Players.LocalPlayer.PlayerGui
task.wait()
local dx = -f.AbsolutePosition.X
g:Destroy()
return string.format("%%d,%%d", c.X + dx, c.Y)
"""


class Session:
    def __init__(self, sid):
        self.sid = sid
        self.next_id = 0
        self.proc = subprocess.Popen(["cmd.exe", "/c", BAT], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True, encoding="utf-8")
        self._send("initialize", {"protocolVersion": "2025-06-18", "capabilities": {}, "clientInfo": {"name": "mcp_session.py", "version": "0"}})
        self._send("notifications/initialized", notify=True)

    def _send(self, method, params=None, notify=False):
        msg = {"jsonrpc": "2.0", "method": method}
        if params is not None:
            msg["params"] = params
        if not notify:
            self.next_id += 1
            msg["id"] = self.next_id
        self.proc.stdin.write(json.dumps(msg) + "\n")
        self.proc.stdin.flush()
        if notify:
            return None
        while True:
            line = self.proc.stdout.readline()
            if not line:
                raise RuntimeError("MCP server closed the connection")
            reply = json.loads(line)
            if reply.get("id") == self.next_id:
                return reply

    def call(self, tool, args, tries=40):
        args = dict(args)
        args.setdefault("studio_id", self.sid)
        for _ in range(tries):
            reply = self._send("tools/call", {"name": tool, "arguments": args})
            if "error" in reply:
                return "ERROR: " + json.dumps(reply["error"])
            out = []
            for part in reply["result"].get("content", []):
                if part.get("type") == "text":
                    out.append(part["text"])
                elif part.get("type") == "image":
                    os.makedirs(os.path.join(ROOT, "captures"), exist_ok=True)
                    path = os.path.join(ROOT, "captures", f"{args.get('capture_id', 'capture')}.png")
                    with open(path, "wb") as f:
                        f.write(base64.b64decode(part["data"]))
                    out.append("saved " + path)
            text = "\n".join(out)
            if NOT_CONNECTED not in text:
                return text
            time.sleep(1.5)
        return text

    def luau(self, code, dm="Client"):
        return self.call("execute_luau", {"datamodel_type": dm, "code": code})

    def click(self, q, wait=300):
        where = self.luau(FIND % json.dumps(q))
        if "," not in where or "NOTFOUND" in where:
            return f"NOT FOUND: {q}"
        x, y = where.strip().split("\n")[-1].split(",")
        acts = [{"action": "moveTo", "x": int(x), "y": int(y)}, {"action": "wait", "wait_time_ms": 60}, {"action": "mouseButtonClick", "mouse_button": "left"}, {"action": "wait", "wait_time_ms": wait}]
        self.call("user_mouse_input", {"datamodel_type": "Client", "actions": acts})
        return f"clicked '{q}' at {x},{y}"

    def shot(self, cid):
        return self.call("screen_capture", {"capture_id": cid})

    def close(self):
        self.proc.kill()
