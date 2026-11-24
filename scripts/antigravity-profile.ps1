# Open Antigravity with its own profile folder, so a second Google account can be signed in next to the first.
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File scripts\antigravity-profile.ps1 -Name second
# Sign in inside the window that opens. To switch accounts later, close Antigravity and run this again with the other -Name
# (-Name default opens your normal profile). Agent HQ's Antigravity lane works with whichever profile is open.
param([Parameter(Mandatory)][ValidatePattern('^[\w.-]{1,40}$')][string]$Name, [string]$Repo = (Split-Path -Parent $PSScriptRoot))
$exe = Join-Path $env:LOCALAPPDATA 'Programs\Antigravity\Antigravity.exe'
if (-not (Test-Path $exe)) { throw "Antigravity is not installed at $exe" }
if ($Name -eq 'default') { Start-Process $exe -ArgumentList "`"$Repo`""; return }
$dir = Join-Path $env:USERPROFILE ".antigravity-accounts\$Name"
New-Item -ItemType Directory -Force $dir | Out-Null
Start-Process $exe -ArgumentList "--user-data-dir `"$dir`" `"$Repo`""
"Antigravity opened with profile '$Name' ($dir). Sign in there."
