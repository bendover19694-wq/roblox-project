# Antigravity account rotation. Antigravity keeps its Google sign-in in Windows Credential Manager (gemini:antigravity) and in
# ~\.gemini\jetski-standalone-oauth-token. This saves each account's sign-in (encrypted for your Windows user with DPAPI),
# swaps it in when you switch, and in watch mode switches by itself when the language server log shows a quota error.
#   -Action save -Name Adi      save the account signed in now (do this first)
#   -Action new -Name second    save the current one again, clear the sign-in WITHOUT signing out, open Antigravity signed out
#                               -> sign in the other Google account there, then: -Action save -Name second
#   -Action use -Name Adi       switch now (closes and reopens Antigravity)
#   -Action next                switch to the next account that is not marked out of quota
#   -Action watch               keep running: on a quota error, mark the account until its reset and switch to the next
#   -Action list                accounts, the active one, and quota marks
# The saved files only decrypt for your Windows user on this PC. Never share the .antigravity-accounts folder.
param([Parameter(Mandatory)][ValidateSet('save', 'new', 'use', 'next', 'watch', 'list')][string]$Action, [ValidatePattern('^[\w.-]{1,40}$')][string]$Name, [int]$QuotaHours = 5)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Security
Add-Type @"
using System; using System.Runtime.InteropServices;
public class AgCred {
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)] public struct CREDENTIAL { public int Flags; public int Type; public string TargetName; public string Comment; public long LastWritten; public int CredentialBlobSize; public IntPtr CredentialBlob; public int Persist; public int AttributeCount; public IntPtr Attributes; public string TargetAlias; public string UserName; }
  [DllImport("advapi32.dll", CharSet=CharSet.Unicode, SetLastError=true)] static extern bool CredRead(string t, int type, int flags, out IntPtr c);
  [DllImport("advapi32.dll", CharSet=CharSet.Unicode, SetLastError=true)] static extern bool CredWrite(ref CREDENTIAL c, int flags);
  [DllImport("advapi32.dll", CharSet=CharSet.Unicode, SetLastError=true)] static extern bool CredDelete(string t, int type, int flags);
  [DllImport("advapi32.dll")] static extern void CredFree(IntPtr c);
  public static byte[] Read(string t) { IntPtr p; if (!CredRead(t, 1, 0, out p)) return null; var c = (CREDENTIAL)Marshal.PtrToStructure(p, typeof(CREDENTIAL)); var b = new byte[c.CredentialBlobSize]; Marshal.Copy(c.CredentialBlob, b, 0, b.Length); CredFree(p); return b; }
  public static void Write(string t, string user, byte[] b) { var c = new CREDENTIAL(); c.Type = 1; c.TargetName = t; c.UserName = user; c.Persist = 2; c.CredentialBlobSize = b.Length; c.CredentialBlob = Marshal.AllocHGlobal(b.Length); Marshal.Copy(b, 0, c.CredentialBlob, b.Length); try { if (!CredWrite(ref c, 0)) throw new Exception("CredWrite failed " + Marshal.GetLastWin32Error()); } finally { Marshal.FreeHGlobal(c.CredentialBlob); } }
  public static void Delete(string t) { CredDelete(t, 1, 0); }
}
"@
$target = 'gemini:antigravity'
$token = Join-Path $env:USERPROFILE '.gemini\jetski-standalone-oauth-token'
$store = Join-Path $env:USERPROFILE '.antigravity-accounts'
$exe = Join-Path $env:LOCALAPPDATA 'Programs\Antigravity\Antigravity.exe'
$log = Join-Path $env:APPDATA 'Antigravity\logs\language_server.log'
$activeFile = Join-Path $store 'active.txt'
$limitsFile = Join-Path $store 'limits.json'
New-Item -ItemType Directory -Force $store | Out-Null
$scope = [System.Security.Cryptography.DataProtectionScope]::CurrentUser

function Accounts { @(Get-ChildItem $store -Directory | Where-Object { Test-Path (Join-Path $_.FullName 'cred.bin') } | Sort-Object Name | ForEach-Object Name) }
function Active { if (Test-Path $activeFile) { (Get-Content $activeFile -Raw).Trim() } else { '' } }
function Limits { $h = @{}; if (Test-Path $limitsFile) { (Get-Content $limitsFile -Raw | ConvertFrom-Json).PSObject.Properties | ForEach-Object { $h[$_.Name] = [datetime]$_.Value } }; $h }
function Save-Limits($h) { ($h.GetEnumerator() | Where-Object { $_.Value -gt (Get-Date) } | ForEach-Object -Begin { $o = @{} } -Process { $o[$_.Key] = $_.Value.ToString('o') } -End { $o }) | ConvertTo-Json | Set-Content $limitsFile }
function Close-AG { Get-Process Antigravity, language_server -ErrorAction SilentlyContinue | Stop-Process -Force; Start-Sleep -Seconds 2 }
function Save-As([string]$n) {
  $b = [AgCred]::Read($target)
  if (-not $b) { throw 'Antigravity is not signed in (no gemini:antigravity credential).' }
  $d = Join-Path $store $n; New-Item -ItemType Directory -Force $d | Out-Null
  [IO.File]::WriteAllBytes((Join-Path $d 'cred.bin'), [System.Security.Cryptography.ProtectedData]::Protect($b, $null, $scope))
  if (Test-Path $token) { Copy-Item $token (Join-Path $d 'token') -Force }
  Set-Content $activeFile $n
}
function Switch-To([string]$n) {
  $d = Join-Path $store $n
  if (-not (Test-Path (Join-Path $d 'cred.bin'))) { throw "No saved account '$n'. Saved: $((Accounts) -join ', ')" }
  Close-AG
  $a = Active; if ($a -and $a -ne $n -and [AgCred]::Read($target)) { Save-As $a } # keep the refreshed sign-in of the account we leave
  [AgCred]::Write($target, 'antigravity', [System.Security.Cryptography.ProtectedData]::Unprotect([IO.File]::ReadAllBytes((Join-Path $d 'cred.bin')), $null, $scope))
  if (Test-Path (Join-Path $d 'token')) { New-Item -ItemType Directory -Force (Split-Path $token) | Out-Null; Copy-Item (Join-Path $d 'token') $token -Force }
  Set-Content $activeFile $n
  Start-Process $exe
  "Antigravity is now '$n'."
}
function Next-Account { $all = Accounts; $lim = Limits; $a = Active; $i = [Array]::IndexOf($all, $a)
  for ($k = 1; $k -le $all.Count; $k++) { $c = $all[($i + $k) % $all.Count]; if ($c -ne $a -and -not ($lim[$c] -gt (Get-Date))) { return $c } }; return $null }

switch ($Action) {
  'save' { if (-not $Name) { throw 'Give -Name, e.g. -Name Adi' }; Save-As $Name; "Saved the signed-in account as '$Name'." }
  'new' {
    if (-not $Name) { throw 'Give -Name for the new account, e.g. -Name second' }
    $a = Active; if (-not $a) { throw 'Save the current account first: -Action save -Name <its name>' }
    Close-AG; Save-As $a
    [AgCred]::Delete($target); if (Test-Path $token) { Remove-Item $token -Force } # cleared on this PC only: no sign-out, nothing revoked
    Remove-Item $activeFile -ErrorAction SilentlyContinue
    Start-Process $exe
    "Antigravity opened signed out. Sign in with the other Google account, then run: -Action save -Name $Name"
  }
  'use' { if (-not $Name) { throw 'Give -Name' }; Switch-To $Name }
  'next' { $n = Next-Account; if (-not $n) { 'Every other account is marked out of quota.' } else { Switch-To $n } }
  'list' { $a = Active; $lim = Limits; foreach ($n in Accounts) { "$n$(if ($n -eq $a) { ' (active)' })$(if ($lim[$n] -gt (Get-Date)) { " out of quota until $($lim[$n])" })" } }
  'watch' {
    if ((Accounts).Count -lt 2) { throw 'Save at least two accounts first.' }
    "Watching $log for quota errors. Ctrl+C stops."
    $pos = if (Test-Path $log) { (Get-Item $log).Length } else { 0 }
    $quota = 'RESOURCE_EXHAUSTED|Too Many Requests|status(?:Code)?[ =:]+429|code[ =:]+429|quota (?:exceeded|exhausted)|exceeded your (?:current )?quota|rate limit exceeded'
    while ($true) {
      Start-Sleep -Seconds 20
      if (-not (Test-Path $log)) { continue }
      $len = (Get-Item $log).Length
      if ($len -lt $pos) { $pos = 0 } # Antigravity restarted and began a new log
      if ($len -eq $pos) { continue }
      $fs = [IO.File]::Open($log, 'Open', 'Read', 'ReadWrite'); $fs.Seek($pos, 'Begin') | Out-Null
      $text = (New-Object IO.StreamReader $fs).ReadToEnd(); $fs.Close(); $pos = $len
      if ($text -notmatch $quota) { continue }
      $a = Active
      $lim = Limits; $lim[$a] = (Get-Date).AddHours($QuotaHours); Save-Limits $lim
      $n = Next-Account
      if (-not $n) { "$(Get-Date -Format t) '$a' is out of quota and every other account is too; waiting."; continue }
      "$(Get-Date -Format t) '$a' hit its quota; switching to '$n'."
      Switch-To $n | Out-Null
      Start-Sleep -Seconds 30; $pos = if (Test-Path $log) { (Get-Item $log).Length } else { 0 }
    }
  }
}
