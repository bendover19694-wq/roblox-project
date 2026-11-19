import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from mcp_session import Session
s = Session(sys.argv[1]); print(s.call("save_place", {})); s.close()
