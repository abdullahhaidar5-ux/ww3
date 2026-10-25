<#
.SYNOPSIS
  Gets this Windows PC ready to host World War 3 online matches for players around the world.

.DESCRIPTION
  In World War 3 the host's browser runs the whole battle and every player connects straight to it, so the host PC
  dozing off, its network adapter napping to save power, or the game running on the weak built-in graphics chip
  shows up as lag or dropped players for everyone. This script fixes the settings that cause that.

  Run it with no options to see what it would change (nothing is changed).
  Run it with -Apply to make the changes. Your previous settings are saved first.
  Run it with -Undo to put everything back exactly as it was.

  What it changes (only while the laptop is PLUGGED IN; battery behaviour is left alone):
    1. Never sleep or hibernate, and keep running when the lid is closed.
    2. Wi-Fi adapter power saving off (Maximum Performance), which removes periodic lag spikes on Wi-Fi.
    3. Windows may no longer switch off the network adapters to save power.
    4. Energy-Efficient Ethernet off on wired adapters (it adds small delays waking the link).
    5. Your web browsers run on the high-performance graphics card, if the PC has one.

  What it only checks and reports: Wi-Fi vs cable, a VPN being connected, running on battery.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\Optimize-WW3Host.ps1
  powershell -ExecutionPolicy Bypass -File .\Optimize-WW3Host.ps1 -Apply
  powershell -ExecutionPolicy Bypass -File .\Optimize-WW3Host.ps1 -Undo
#>
[CmdletBinding()]
param([switch]$Apply, [switch]$Undo)

$ErrorActionPreference = 'Stop'
$BackupDir  = Join-Path $env:LOCALAPPDATA 'WW3Host'
$BackupFile = Join-Path $BackupDir 'backup.json'
$GpuKey     = 'HKCU:\Software\Microsoft\DirectX\UserGpuPreferences'

# powercfg setting addresses (subgroup, setting)
$PW = [ordered]@{
  Sleep     = @('SUB_SLEEP',   'STANDBYIDLE',  'Sleep after (plugged in)',            0, 'never')
  Hibernate = @('SUB_SLEEP',   'HIBERNATEIDLE','Hibernate after (plugged in)',        0, 'never')
  Lid       = @('SUB_BUTTONS', 'LIDACTION',    'Closing the lid (plugged in)',        0, 'do nothing')
  WiFiPower = @('19cbb8fa-5279-450e-9fac-8a3d5fedd0c1', '12bbebe6-58d6-4636-95bb-3217ef867c1a',
                'Wi-Fi adapter power saving (plugged in)', 0, 'Maximum Performance')
}

function Say($text, $color = 'Gray') { Write-Host $text -ForegroundColor $color }
function Is-Admin {
  $id = [Security.Principal.WindowsIdentity]::GetCurrent()
  (New-Object Security.Principal.WindowsPrincipal $id).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# Reads the current plugged-in (AC) value of a power setting. powercfg's labels are translated on non-English Windows,
# so this takes the numbers instead: the last two 0x######## values printed are the AC and DC settings.
function Get-AcValue($sub, $setting) {
  $out = (& powercfg /query SCHEME_CURRENT $sub $setting 2>$null) -join "`n"
  $vals = [regex]::Matches($out, '0x[0-9a-fA-F]{8}') | ForEach-Object { [Convert]::ToInt64($_.Value, 16) }
  if (@($vals).Count -ge 2) { return [int]$vals[-2] }
  return $null   # this PC doesn't have that setting (e.g. no lid, or the Wi-Fi setting is hidden by the driver)
}
function Set-AcValue($sub, $setting, $value) {
  & powercfg /setacvalueindex SCHEME_CURRENT $sub $setting $value | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "powercfg couldn't set $setting" }
}

function Get-Nics {
  @(Get-NetAdapter -Physical -ErrorAction SilentlyContinue | Where-Object { $_.Status -ne 'Disabled' })
}

function Get-BrowserPaths {
  $c = @(
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
    "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
    "$env:ProgramFiles\BraveSoftware\Brave-Browser\Application\brave.exe",
    "$env:LOCALAPPDATA\BraveSoftware\Brave-Browser\Application\brave.exe",
    "$env:ProgramFiles\Mozilla Firefox\firefox.exe",
    "$env:LOCALAPPDATA\Programs\Opera\opera.exe",
    "$env:LOCALAPPDATA\Programs\Opera GX\opera.exe"
  )
  $c | Where-Object { $_ -and (Test-Path -LiteralPath $_) } | Select-Object -Unique
}

function Has-DedicatedGpu {
  $g = @(Get-CimInstance Win32_VideoController -ErrorAction SilentlyContinue | ForEach-Object { $_.Name })
  [bool]($g | Where-Object { $_ -match 'NVIDIA|GeForce|RTX|GTX|Radeon RX|Radeon Pro|Arc A|Arc B' })
}

# ---------------------------------------------------------------- report
function Show-Checks {
  Say ''
  Say '== Checks (nothing to change here, but they matter) ==' 'Cyan'
  $nics = Get-Nics | Where-Object Status -eq 'Up'
  $wired = $nics | Where-Object { $_.MediaType -eq '802.3' -and $_.InterfaceDescription -notmatch 'Virtual|TAP|Wintun|WireGuard|VPN' }
  $wifi  = $nics | Where-Object { $_.MediaType -match '802.11|Native 802.11' -or $_.InterfaceDescription -match 'Wi-?Fi|Wireless|WLAN' }
  if ($wired) { Say "  [OK]   Connected by cable ($($wired[0].Name))." 'Green' }
  elseif ($wifi) { Say "  [!!]   You're on Wi-Fi. For hosting, plug in an Ethernet cable: Wi-Fi causes the lag spikes players notice most." 'Yellow' }

  $vpn = @(Get-NetAdapter -ErrorAction SilentlyContinue | Where-Object { $_.Status -eq 'Up' -and $_.InterfaceDescription -match 'TAP-Windows|OpenVPN|Wintun|WireGuard|VPN' })
  if ($vpn.Count) { Say "  [!!]   A VPN is connected ($($vpn[0].InterfaceDescription)). Disconnect it while hosting: it adds delay and can stop players connecting." 'Yellow' }
  else { Say '  [OK]   No VPN connected.' 'Green' }

  try {
    $bat = Get-CimInstance Win32_Battery -ErrorAction SilentlyContinue
    if ($bat -and $bat.BatteryStatus -eq 1) { Say '  [!!]   Running on battery. Plug the laptop in while hosting (these settings only apply when plugged in).' 'Yellow' }
    elseif ($bat) { Say '  [OK]   Plugged in.' 'Green' }
  } catch {}
}

function Show-Plan {
  Say ''
  Say '== Settings ==' 'Cyan'
  foreach ($k in $PW.Keys) {
    $s = $PW[$k]; $cur = Get-AcValue $s[0] $s[1]
    if ($null -eq $cur) { Say ("  [--]   {0}: not on this PC, skipped" -f $s[2]) 'DarkGray'; continue }
    if ($cur -eq $s[3]) { Say ("  [OK]   {0}: already {1}" -f $s[2], $s[4]) 'Green' }
    else {
      $shown = if ($k -in 'Sleep','Hibernate') { "$([math]::Round($cur/60)) min" } else { "setting $cur" }
      Say ("  [FIX]  {0}: {1} -> {2}" -f $s[2], $shown, $s[4]) 'Yellow'
    }
  }
  foreach ($n in Get-Nics) {
    try {
      $pm = Get-NetAdapterPowerManagement -Name $n.Name -ErrorAction Stop
      if ("$($pm.AllowComputerToTurnOffDevice)" -eq 'Enabled') { Say "  [FIX]  '$($n.Name)': Windows may switch it off to save power -> never" 'Yellow' }
      else { Say "  [OK]   '$($n.Name)': Windows won't switch it off" 'Green' }
    } catch { Say "  [--]   '$($n.Name)': power management not adjustable by its driver" 'DarkGray' }
    $eee = Get-NetAdapterAdvancedProperty -Name $n.Name -RegistryKeyword '*EEE' -ErrorAction SilentlyContinue
    if ($eee) {
      if ("$($eee.RegistryValue)" -ne '0') { Say "  [FIX]  '$($n.Name)': Energy-Efficient Ethernet on -> off" 'Yellow' }
      else { Say "  [OK]   '$($n.Name)': Energy-Efficient Ethernet off" 'Green' }
    }
  }
  $browsers = @(Get-BrowserPaths)
  if (-not (Has-DedicatedGpu)) { Say '  [--]   No separate graphics card found; browser GPU choice skipped' 'DarkGray' }
  else {
    foreach ($b in $browsers) {
      $v = (Get-ItemProperty -Path $GpuKey -Name $b -ErrorAction SilentlyContinue).$b
      if ($v -match 'GpuPreference=2;') { Say "  [OK]   $(Split-Path $b -Leaf): uses the high-performance graphics card" 'Green' }
      else { Say "  [FIX]  $(Split-Path $b -Leaf): Windows decides -> high-performance graphics card" 'Yellow' }
    }
  }
}

# ---------------------------------------------------------------- apply / undo
function Do-Apply {
  New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
  $backup = [ordered]@{ saved = (Get-Date).ToString('s'); power = @{}; nicPower = @{}; nicEee = @{}; gpu = @{} }
  if (Test-Path $BackupFile) {
    # keep the ORIGINAL settings from the first run, so -Undo always restores what you had before this script
    $old = Get-Content $BackupFile -Raw | ConvertFrom-Json
    Say "  (Earlier backup from $($old.saved) kept, so Undo still restores your original settings.)" 'DarkGray'
    $backup = $null
  }

  foreach ($k in $PW.Keys) {
    $s = $PW[$k]; $cur = Get-AcValue $s[0] $s[1]
    if ($null -eq $cur) { continue }
    if ($backup) { $backup.power[$k] = $cur }
    if ($cur -ne $s[3]) { Set-AcValue $s[0] $s[1] $s[3]; Say "  Set: $($s[2]) = $($s[4])" 'Green' }
  }
  & powercfg /setactive SCHEME_CURRENT | Out-Null

  foreach ($n in Get-Nics) {
    try {
      $pm = Get-NetAdapterPowerManagement -Name $n.Name -ErrorAction Stop
      if ($backup) { $backup.nicPower[$n.Name] = "$($pm.AllowComputerToTurnOffDevice)" }
      if ("$($pm.AllowComputerToTurnOffDevice)" -eq 'Enabled') {
        Set-NetAdapterPowerManagement -Name $n.Name -AllowComputerToTurnOffDevice Disabled -NoRestart -ErrorAction Stop
        Say "  Set: '$($n.Name)' stays on (no power-saving switch-off)" 'Green'
      }
    } catch { Say "  Skipped '$($n.Name)' power management: $($_.Exception.Message)" 'DarkGray' }
    $eee = Get-NetAdapterAdvancedProperty -Name $n.Name -RegistryKeyword '*EEE' -ErrorAction SilentlyContinue
    if ($eee -and "$($eee.RegistryValue)" -ne '0') {
      if ($backup) { $backup.nicEee[$n.Name] = "$($eee.RegistryValue)" }
      try {
        # -NoRestart: the change takes effect the next time the adapter reconnects, so a hosting session isn't cut off now
        Set-NetAdapterAdvancedProperty -Name $n.Name -RegistryKeyword '*EEE' -RegistryValue 0 -NoRestart -ErrorAction Stop
        Say "  Set: '$($n.Name)' Energy-Efficient Ethernet off (takes effect after a reconnect or restart)" 'Green'
      } catch { Say "  Skipped '$($n.Name)' Energy-Efficient Ethernet: $($_.Exception.Message)" 'DarkGray' }
    }
  }

  if (Has-DedicatedGpu) {
    if (-not (Test-Path $GpuKey)) { New-Item -Path $GpuKey -Force | Out-Null }
    foreach ($b in Get-BrowserPaths) {
      $v = (Get-ItemProperty -Path $GpuKey -Name $b -ErrorAction SilentlyContinue).$b
      if ($backup) { $backup.gpu[$b] = if ($null -eq $v) { '<none>' } else { $v } }
      if ($v -notmatch 'GpuPreference=2;') {
        Set-ItemProperty -Path $GpuKey -Name $b -Value 'GpuPreference=2;' -Type String
        Say "  Set: $(Split-Path $b -Leaf) uses the high-performance graphics card (restart the browser)" 'Green'
      }
    }
  }

  if ($backup) { $backup | ConvertTo-Json -Depth 4 | Set-Content -Path $BackupFile -Encoding UTF8; Say "  Previous settings saved to $BackupFile" 'DarkGray' }
}

function Do-Undo {
  if (-not (Test-Path $BackupFile)) { Say 'Nothing to undo: no backup found (the script was never applied on this account).' 'Yellow'; return }
  $b = Get-Content $BackupFile -Raw | ConvertFrom-Json
  foreach ($p in $b.power.PSObject.Properties) {
    $s = $PW[$p.Name]; if ($s) { Set-AcValue $s[0] $s[1] ([int]$p.Value); Say "  Restored: $($s[2])" 'Green' }
  }
  & powercfg /setactive SCHEME_CURRENT | Out-Null
  foreach ($p in $b.nicPower.PSObject.Properties) {
    if ($p.Value -eq 'Enabled') {
      try { Set-NetAdapterPowerManagement -Name $p.Name -AllowComputerToTurnOffDevice Enabled -NoRestart -ErrorAction Stop; Say "  Restored: '$($p.Name)' power saving" 'Green' }
      catch { Say "  Couldn't restore '$($p.Name)': $($_.Exception.Message)" 'Yellow' }
    }
  }
  foreach ($p in $b.nicEee.PSObject.Properties) {
    try { Set-NetAdapterAdvancedProperty -Name $p.Name -RegistryKeyword '*EEE' -RegistryValue $p.Value -NoRestart -ErrorAction Stop; Say "  Restored: '$($p.Name)' Energy-Efficient Ethernet" 'Green' }
    catch { Say "  Couldn't restore '$($p.Name)' EEE: $($_.Exception.Message)" 'Yellow' }
  }
  foreach ($p in $b.gpu.PSObject.Properties) {
    if ($p.Value -eq '<none>') { Remove-ItemProperty -Path $GpuKey -Name $p.Name -ErrorAction SilentlyContinue }
    else { Set-ItemProperty -Path $GpuKey -Name $p.Name -Value $p.Value -Type String }
    Say "  Restored: $(Split-Path $p.Name -Leaf) graphics choice" 'Green'
  }
  Remove-Item $BackupFile -Force
  Say '  All settings are back to how they were.' 'Green'
}

# ---------------------------------------------------------------- main
Say 'World War 3 - host PC tune-up' 'White'
if (($Apply -or $Undo) -and -not (Is-Admin)) {
  Say 'Please run this as administrator: right-click Windows PowerShell > Run as administrator, then run the command again.' 'Red'
  exit 1
}
if ($Apply -and $Undo) { Say 'Use either -Apply or -Undo, not both.' 'Red'; exit 1 }

if ($Undo) { Do-Undo; exit 0 }
Show-Plan
Show-Checks
if ($Apply) {
  Say ''; Say '== Applying ==' 'Cyan'
  Do-Apply
  Say ''; Say 'Done. Restart your browser so the graphics change takes effect.' 'White'
} else {
  Say ''; Say 'Nothing was changed. To make the [FIX] changes, run again with -Apply (as administrator).' 'White'
}
Say 'Also: Settings > System > Power & battery > Power mode > Best performance (one click, while hosting).' 'Gray'
