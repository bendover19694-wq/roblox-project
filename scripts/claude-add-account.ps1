# Add another Claude account for Agent HQ's claude-cli agents. Each account gets its own CLAUDE_CONFIG_DIR folder and its
# own login; HQ switches to the next account when one is at its usage limit or signed out.
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File scripts\claude-add-account.ps1 -Name second
# Claude Code opens: type /login, sign in in the browser with the account you want, then /exit. No password passes through here.
param([Parameter(Mandatory)][ValidatePattern('^[\w.-]{1,40}$')][string]$Name, [string]$HqUrl = 'http://127.0.0.1:4317')
$ErrorActionPreference = 'Stop'
$dir = Join-Path $env:USERPROFILE ".claude-accounts\$Name"
New-Item -ItemType Directory -Force $dir | Out-Null
"Claude Code opens with an empty profile for '$Name'. Type /login, sign in, then /exit."
$env:CLAUDE_CONFIG_DIR = $dir
claude
Remove-Item Env:CLAUDE_CONFIG_DIR

$tokenFile = Join-Path (Split-Path -Parent $PSScriptRoot) '.agent-hq\owner-token'
if (-not (Test-Path $tokenFile)) { $tokenFile = Join-Path $env:USERPROFILE 'Documents\Agent-HQ-App\.agent-hq\owner-token' }
$h = @{ 'x-hq-token' = (Get-Content $tokenFile -Raw).Trim(); 'content-type' = 'application/json' }
$settings = Invoke-RestMethod "$HqUrl/api/settings" -Headers $h
$cur = @($settings.claudeAccounts | Where-Object { $_ })
if (-not $cur.Count) { $cur = @(@{ name = 'main'; home = 'default' }) }
$list = @($cur | Where-Object { $_.home -ne $dir }) + @(@{ name = $Name; home = $dir })
Invoke-RestMethod "$HqUrl/api/settings" -Method Post -Headers $h -Body (@{ key = 'claudeAccounts'; value = $list } | ConvertTo-Json -Depth 4) | Out-Null
"Added. Claude agents now rotate through: $(($list | ForEach-Object { $_.name }) -join ', ')"
