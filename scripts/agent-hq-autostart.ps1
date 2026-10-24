# Installs or removes the Agent HQ login autostart and desktop shortcut. Called by the install/uninstall .bat files.
param([switch]$Remove)
$here = $PSScriptRoot
$sh = New-Object -ComObject WScript.Shell
$startupLink = Join-Path ([Environment]::GetFolderPath('Startup')) 'Agent HQ.lnk'
$desktopLink = Join-Path ([Environment]::GetFolderPath('Desktop')) 'Agent HQ.lnk'

if ($Remove) {
  Remove-Item -LiteralPath $startupLink, $desktopLink -ErrorAction SilentlyContinue
  'Agent HQ autostart and desktop shortcut removed. HQ keeps running until you sign out or end "node" in Task Manager.'
  return
}

# Runs hidden at every Windows sign-in and keeps HQ alive.
$up = $sh.CreateShortcut($startupLink)
$up.TargetPath = Join-Path $env:WINDIR 'System32\wscript.exe'
$up.Arguments = '"' + (Join-Path $here 'agent-hq-hidden.vbs') + '"'
$up.WorkingDirectory = $here
$up.Description = 'Keep Agent HQ running'
$up.Save()

# Double-click to open the dashboard signed in.
$d = $sh.CreateShortcut($desktopLink)
$d.TargetPath = Join-Path $here 'Agent HQ.bat'
$d.WorkingDirectory = $here
$d.WindowStyle = 7  # minimized: the console only flashes while it waits for HQ
$d.IconLocation = Join-Path $env:WINDIR 'System32\shell32.dll,13'
$d.Description = 'Open Agent HQ'
$d.Save()

Start-Process -FilePath (Join-Path $env:WINDIR 'System32\wscript.exe') -ArgumentList ('"' + (Join-Path $here 'agent-hq-hidden.vbs') + '"')
"Installed. Agent HQ now starts when you sign in, and 'Agent HQ' on your desktop opens it."
