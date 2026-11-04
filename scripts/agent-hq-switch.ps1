# One-time switch: move Agent HQ from an old worktree to a stable app copy that always runs the newest code.
# Run: powershell -NoProfile -ExecutionPolicy Bypass -File agent-hq-switch.ps1 -WhatIf   (prints every step, changes nothing)
# Every path is a parameter so the script can be tested on temp copies. Defaults point at the real ones.
param(
  [string]$MainRepo = 'C:/Users/aryam/Downloads/Roblox Project',
  [string]$OldDir = 'C:/Users/aryam/Downloads/Roblox Project/.claude/worktrees/video-skills-plugins-8346b5',
  [string]$AppDir = (Join-Path $env:USERPROFILE 'Documents\Agent-HQ-App'),
  [string]$ConfigFile = (Join-Path $env:USERPROFILE 'Documents\Agent-HQ-App.json'),
  [string]$BackupRoot = (Join-Path $env:USERPROFILE 'Documents\Agent-HQ-Backups'),
  [string]$Branch = 'claude/agent-hq-parity-continue-a937bb',
  [string[]]$ScanFiles = @(
    (Join-Path $MainRepo '.mcp.json'),
    (Join-Path $env:USERPROFILE '.claude.json'),
    (Join-Path $env:APPDATA 'Claude\claude_desktop_config.json')),
  [int]$Port = 4317,
  [switch]$SkipAutostart,
  [switch]$SkipAntigravity,
  [switch]$NoStart,
  [switch]$WhatIf
)
$ErrorActionPreference = 'Stop'
function Norm([string]$p) { ([IO.Path]::GetFullPath($p)).TrimEnd('\', '/').ToLowerInvariant() }
function Step([string]$text, [scriptblock]$act) {
  if ($WhatIf) { "[WhatIf] $text"; return }
  "[do] $text"; & $act
}
function GitX { & git @args; if ($LASTEXITCODE -ne 0) { throw "git $($args -join ' ') failed" } }

if ((Norm $AppDir) -eq (Norm $OldDir)) { throw 'AppDir and OldDir are the same folder.' }
if ($AppDir -match 'Agent-HQ-Studio') { throw 'Agent-HQ-Studio is never touched.' }

# Branch: an existing config wins, otherwise create it from -Branch.
if (Test-Path -LiteralPath $ConfigFile) { $Branch = (Get-Content -Raw -LiteralPath $ConfigFile | ConvertFrom-Json).branch }
else { Step "write $ConfigFile with branch $Branch" { @{ branch = $Branch } | ConvertTo-Json | Set-Content -LiteralPath $ConfigFile -Encoding utf8 } }
"Branch: $Branch"

# 1. App copy: a detached worktree of the main repo at origin/<branch>.
if (-not (Test-Path -LiteralPath (Join-Path $AppDir '.git'))) {
  Step "git fetch origin $Branch (in $MainRepo)" { GitX -C $MainRepo fetch origin $Branch }
  Step "git worktree add --detach $AppDir origin/$Branch" { GitX -C $MainRepo worktree add --detach $AppDir "origin/$Branch" }
} else { "App copy already exists: $AppDir" }

# 2. Stop the old HQ: only node processes whose command line has the OLD path and keepalive.mjs or server.mjs.
$oldKey = (Norm $OldDir).Replace('\', '/')
$old = @(Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object {
  $c = ([string]$_.CommandLine).ToLowerInvariant().Replace('\', '/')
  $c.Contains($oldKey) -and ($c.Contains('keepalive.mjs') -or $c.Contains('server.mjs')) })
if ($old.Count -eq 0) { 'No old HQ processes found.' }
foreach ($p in $old) { Step "stop old HQ process $($p.ProcessId): $($p.CommandLine)" { Stop-Process -Id $p.ProcessId -Force } }

# 3. Back up OLD/.agent-hq, then copy it into the app copy. The original is never moved or deleted.
$oldState = Join-Path $OldDir '.agent-hq'
if (Test-Path -LiteralPath $oldState) {
  $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
  $bak = Join-Path $BackupRoot $stamp
  Step "back up $oldState to $bak" { New-Item -ItemType Directory -Force -Path $bak | Out-Null; Copy-Item -LiteralPath $oldState -Destination $bak -Recurse }
  Step "copy $oldState to $(Join-Path $AppDir '.agent-hq')" {
    New-Item -ItemType Directory -Force -Path (Join-Path $AppDir '.agent-hq') | Out-Null
    Copy-Item -Path (Join-Path $oldState '*') -Destination (Join-Path $AppDir '.agent-hq') -Recurse -Force }
} else { "No state folder at $oldState, nothing to copy." }

# 4. Shortcuts (Startup and Desktop) point at the app copy.
if (-not $SkipAutostart) {
  Step "run $(Join-Path $AppDir 'scripts\agent-hq-autostart.ps1') (shortcuts now point at the app copy)" { & (Join-Path $AppDir 'scripts\agent-hq-autostart.ps1') }
}

# 5. Antigravity MCP registration from the app copy.
if (-not $SkipAntigravity) {
  Step "node tools/agent-hq/register-antigravity.mjs (in $AppDir)" { Push-Location $AppDir; try { & node 'tools/agent-hq/register-antigravity.mjs' } finally { Pop-Location } }
}

# 6. Report other registrations that still mention OLD. Nothing outside the app copy is edited.
$needles = @($OldDir.Replace('\', '/'), $OldDir.Replace('/', '\\'))
foreach ($f in $ScanFiles) {
  if ((Test-Path -LiteralPath $f) -and (Select-String -LiteralPath $f -SimpleMatch -Pattern $needles -Quiet)) {
    "CHANGE BY HAND: $f mentions $OldDir. Replace it with $AppDir (keep the rest of the entry)."
  }
}

# 7. Start HQ from the app copy and wait for /api/health.
if (-not $NoStart) {
  Step "start HQ: wscript $(Join-Path $AppDir 'scripts\agent-hq-hidden.vbs'), wait up to 30 s for http://127.0.0.1:$Port/api/health" {
    Start-Process -FilePath (Join-Path $env:WINDIR 'System32\wscript.exe') -ArgumentList ('"' + (Join-Path $AppDir 'scripts\agent-hq-hidden.vbs') + '"')
    $ok = $false
    for ($i = 0; $i -lt 30 -and -not $ok; $i++) {
      try { $ok = (Invoke-WebRequest "http://127.0.0.1:$Port/api/health" -UseBasicParsing -TimeoutSec 1).StatusCode -eq 200 } catch { Start-Sleep -Seconds 1 }
    }
    if ($ok) { 'HQ is up.' } else { throw "HQ did not answer on port $Port. See $(Join-Path $AppDir '.agent-hq\logs\server.log')" }
  }
}
'Done.'
