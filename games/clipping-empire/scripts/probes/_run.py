import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from mcp_session import Session
s = Session(sys.argv[1]); print(s.luau(open(sys.argv[3], encoding="utf-8").read(), sys.argv[2])); s.close()
