# Add another ChatGPT account for Agent HQ's codex engine. Each account gets its own CODEX_HOME folder and its own login;
# HQ switches to the next account when one reaches its Codex usage limit.
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File scripts\codex-add-account.ps1 -Name second
# You sign in yourself in the browser window Codex opens. No password or key passes through this script.
param([Parameter(Mandatory)][ValidatePattern('^[\w.-]{1,40}$')][string]$Name, [string]$HqUrl = 'http://127.0.0.1:4317')
$ErrorActionPreference = 'Stop'
$home_ = Join-Path $env:USERPROFILE ".codex-accounts\$Name"
New-Item -ItemType Directory -Force $home_ | Out-Null
"Sign in with the ChatGPT account you want as '$Name'. A browser window opens."
$env:CODEX_HOME = $home_
codex login
if ($LASTEXITCODE -ne 0) { throw 'codex login did not finish' }
Remove-Item Env:CODEX_HOME

# Register it with Agent HQ: the default account first, then the others in the order they were added.
$tokenFile = Join-Path (Split-Path -Parent $PSScriptRoot) '.agent-hq\owner-token'
if (-not (Test-Path $tokenFile)) { $tokenFile = Join-Path $env:USERPROFILE 'Documents\Agent-HQ-App\.agent-hq\owner-token' }
$h = @{ 'x-hq-token' = (Get-Content $tokenFile -Raw).Trim(); 'content-type' = 'application/json' }
$settings = Invoke-RestMethod "$HqUrl/api/settings" -Headers $h
$cur = @($settings.codexAccounts | Where-Object { $_ })
if (-not $cur.Count) { $cur = @(@{ name = 'main'; home = 'default' }) }
$list = @($cur | Where-Object { $_.home -ne $home_ }) + @(@{ name = $Name; home = $home_ })
$body = @{ key = 'codexAccounts'; value = $list } | ConvertTo-Json -Depth 4
Invoke-RestMethod "$HqUrl/api/settings" -Method Post -Headers $h -Body $body | Out-Null
"Added. Agent HQ now rotates through: $(($list | ForEach-Object { $_.name }) -join ', ')"
