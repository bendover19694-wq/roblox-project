' Starts the Agent HQ keep-alive with no window. Used by "Agent HQ.bat" and by the login autostart.
Set fso = CreateObject("Scripting.FileSystemObject")
root = fso.GetParentFolderName(fso.GetParentFolderName(WScript.ScriptFullName))
Set sh = CreateObject("WScript.Shell")
sh.CurrentDirectory = root
' 0 = hidden window, False = do not wait
sh.Run "node """ & root & "\tools\agent-hq\keepalive.mjs""", 0, False
