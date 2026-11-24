# UI Lab "Join and capture": opens a Roblox game in the Roblox app (signed in as you), waits for it to load, saves a few
# screenshots of the game window, then closes the Roblox app. Only the owner starts it, from the UI Lab page.
# Usage: capture_game.ps1 -PlaceId 126884695634066 -OutDir <folder> [-Shots 3] [-LoadSeconds 35]
param([Parameter(Mandatory)][ValidatePattern('^\d{1,20}$')][string]$PlaceId, [Parameter(Mandatory)][string]$OutDir, [ValidateRange(1, 6)][int]$Shots = 3, [ValidateRange(10, 120)][int]$LoadSeconds = 35)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type @"
using System; using System.Runtime.InteropServices;
public class Win { [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
  public struct RECT { public int Left, Top, Right, Bottom; } }
"@
[Win]::SetProcessDPIAware() | Out-Null
New-Item -ItemType Directory -Force $OutDir | Out-Null
Start-Process "roblox://experiences/start?placeId=$PlaceId"
$p = $null
for ($i = 0; $i -lt 90 -and -not $p; $i++) { Start-Sleep 1; $p = Get-Process RobloxPlayerBeta -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1 }
if (-not $p) { throw 'The Roblox app did not open within 90 seconds' }
Start-Sleep $LoadSeconds
$saved = @()
for ($n = 0; $n -lt $Shots; $n++) {
  [Win]::SetForegroundWindow($p.MainWindowHandle) | Out-Null
  Start-Sleep -Milliseconds 800
  $r = New-Object Win+RECT
  [Win]::GetWindowRect($p.MainWindowHandle, [ref]$r) | Out-Null
  $w = $r.Right - $r.Left; $h = $r.Bottom - $r.Top
  if ($w -gt 100 -and $h -gt 100) {
    $bmp = New-Object System.Drawing.Bitmap $w, $h
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.CopyFromScreen($r.Left, $r.Top, 0, 0, $bmp.Size)
    $f = Join-Path $OutDir "capture-$n.png"
    $bmp.Save($f, [System.Drawing.Imaging.ImageFormat]::Png); $g.Dispose(); $bmp.Dispose()
    $saved += $f
  }
  Start-Sleep 8
}
Get-Process RobloxPlayerBeta -ErrorAction SilentlyContinue | Stop-Process -Force
$saved -join "`n"
