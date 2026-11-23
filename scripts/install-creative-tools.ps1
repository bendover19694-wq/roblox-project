# One-time setup of the creative tools Agent HQ agents use: Blender (+ MCP add-on), Python libraries for the
# video and voxel skills, the LihFolk and 4ghouls skill packs from ~/Downloads, and the Stud-UI-Clean kit (MIT, GitHub).
# Safe to run again. Prints each step; -WhatIf only prints. Never enters keys: set MESHY_API_KEY yourself if you use Meshy.
param([switch]$WhatIf, [string]$From = (Join-Path $env:USERPROFILE 'Downloads'))
$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
function Step([string]$text, [scriptblock]$act) { if ($WhatIf) { "[WhatIf] $text" } else { "[do] $text"; & $act } }
function Have([string]$cmd) { [bool](Get-Command $cmd -ErrorAction SilentlyContinue) }

# 1. Blender (official package from winget)
$blender = Get-ChildItem 'C:\Program Files\Blender Foundation\*\blender.exe' -ErrorAction SilentlyContinue | Sort-Object FullName -Descending | Select-Object -First 1
if (-not $blender) { Step 'install Blender with winget' { winget install --id BlenderFoundation.Blender -e --silent --accept-package-agreements --accept-source-agreements } }
else { "Blender found: $($blender.FullName)" }

# 2. uv (runs the Blender MCP server) and the Blender add-on
if (-not (Have 'uvx')) { Step 'install uv with winget' { winget install --id astral-sh.uv -e --silent --accept-package-agreements --accept-source-agreements } }
Step 'install the Blender MCP add-on (mcp-for-blender 2.3.1)' { $env:PYTHONIOENCODING = 'utf-8'; uvx 'mcp-for-blender==2.3.1' install-addon }
$blender = Get-ChildItem 'C:\Program Files\Blender Foundation\*\blender.exe' -ErrorAction SilentlyContinue | Sort-Object FullName -Descending | Select-Object -First 1
if ($blender) { Step 'enable the add-on in Blender preferences' { & $blender.FullName -b --factory-startup --python-expr "import bpy; bpy.ops.preferences.addon_enable(module='blender_mcp'); bpy.ops.wm.save_userpref()" | Out-Null } }

# 3. Python libraries for watch-video (frames, transcripts) and the voxel and map skills
Step 'pip install yt-dlp faster-whisper Pillow imagehash numpy opencv-python' { python -m pip install --quiet --disable-pip-version-check yt-dlp faster-whisper Pillow imagehash numpy opencv-python }
if (-not (Have 'ffmpeg')) { Step 'install ffmpeg with winget' { winget install --id Gyan.FFmpeg -e --silent --accept-package-agreements --accept-source-agreements } }

# 4. Skill packs from the downloaded zips (checked: no unsafe paths, executables, .blend files or nested archives)
Step "install skill packs from $From" { python -I (Join-Path $PSScriptRoot 'install_skill_zips.py') --from $From }

# 5. Stud-UI-Clean-Roblox (MIT) from GitHub, pinned to the reviewed commit
$stud = Join-Path $env:USERPROFILE '.claude\skills\stud-ui-clean-roblox'
if (-not (Test-Path (Join-Path $stud 'SKILL.md'))) {
  Step 'install stud-ui-clean-roblox (GitHub, commit 7ae67f3)' {
    $tmp = Join-Path ([IO.Path]::GetTempPath()) ('stud-ui-' + [guid]::NewGuid())
    git clone -q https://github.com/TemporaryLooker22/Stud-UI-Clean-Roblox.git $tmp
    git -C $tmp checkout -q 7ae67f3
    New-Item -ItemType Directory -Force $stud | Out-Null
    git -C $tmp archive HEAD | tar -x -C $stud
    Remove-Item -Recurse -Force $tmp
  }
}

# 6. Smoke test for watch-video
$smoke = Join-Path $env:USERPROFILE '.claude\skills\watch-video\scripts\smoketest.py'
if (Test-Path $smoke) { Step 'watch-video smoke test' { python -I $smoke } }

''
'Next, by hand:'
'- Blender MCP (live editing only): open Blender, press N, BlenderMCP tab, Start MCP Server. Headless builds need nothing.'
'- Penpot (free, open source): sign up at design.penpot.app; run  npx -y @penpot/mcp@stable  and load http://localhost:4400/manifest.json in Penpot, then Connect.'
'- Meshy (optional, paid credits): set the user env var MESHY_API_KEY, then turn on Settings > Art > Use Meshy in Agent HQ.'
'- Restart Claude Code and Agent HQ. Agent HQ > Readiness shows every tool.'
