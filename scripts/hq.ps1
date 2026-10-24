# Starts Agent HQ (if it is not already running) and opens the dashboard signed in as the owner.
# The owner token travels in the URL fragment (#owner=...), which the browser never sends to the server.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$base = 'http://127.0.0.1:4317'
$tokenFile = Join-Path $root '.agent-hq/owner-token'

function Test-HQ { try { (Invoke-WebRequest "$base/api/health" -UseBasicParsing -TimeoutSec 2).StatusCode -eq 200 } catch { $false } }

if (-not (Test-HQ)) {
  Start-Process -FilePath node -ArgumentList 'tools/agent-hq/server.mjs' -WorkingDirectory $root -WindowStyle Hidden
  for ($i = 0; $i -lt 20 -and -not (Test-HQ); $i++) { Start-Sleep -Milliseconds 500 }
  if (-not (Test-HQ)) { throw 'Agent HQ did not start. Run: node tools/agent-hq/server.mjs' }
}
$token = (Get-Content $tokenFile -Raw).Trim()
Start-Process "$base/#owner=$token"
Write-Host "Agent HQ is running at $base (signed-in tab opened). Stop it from Task Manager (node) or by closing its process."
