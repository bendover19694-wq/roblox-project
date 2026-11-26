import json, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from mcp_session import Session
names = sys.argv[2:]
s = Session(sys.argv[1])
print(s.call("upload_image", {"imagePaths": [f"http://127.0.0.1:8765/{n}.png" for n in names]}))
s.close()
