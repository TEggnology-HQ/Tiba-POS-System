<#
.SYNOPSIS
  Adds the POS client to Windows startup (launches on user login).
.DESCRIPTION
  Creates a shortcut in the current user's Startup folder.
  By default it looks for the MSI-installed path; override with -TargetPath.
.PARAMETER TargetPath
  Full path to the POS executable. Default: "C:\Program Files\Tiba POS\Tiba POS.exe"
.PARAMETER Remove
  Remove the startup entry instead of adding it.
.EXAMPLE
  .\setup-startup.ps1
  .\setup-startup.ps1 -TargetPath "D:\Apps\Tiba POS\Tiba POS.exe"
  .\setup-startup.ps1 -Remove
#>

param(
    [string]$TargetPath = "C:\Program Files\Tiba POS\Tiba POS.exe",
    [switch]$Remove
)

$shortcutPath = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup\Tiba POS.lnk"

if ($Remove) {
    if (Test-Path $shortcutPath) {
        Remove-Item $shortcutPath -Force
        Write-Host "[+] Removed startup entry" -ForegroundColor Green
    } else {
        Write-Host "! No startup entry exists" -ForegroundColor Yellow
    }
    exit
}

if (-not (Test-Path $TargetPath)) {
    Write-Host "[-] Executable not found at: $TargetPath" -ForegroundColor Red
    Write-Host "  Either install the MSI first, or pass -TargetPath with the correct location." -ForegroundColor Yellow
    exit 1
}

$WScriptShell = New-Object -ComObject WScript.Shell
$shortcut = $WScriptShell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $TargetPath
$shortcut.Description = "Tiba POS - Point of Sale System"
$shortcut.WorkingDirectory = Split-Path $TargetPath -Parent
$shortcut.Save()

Write-Host "[+] Startup entry created at:" -ForegroundColor Green
Write-Host "  $shortcutPath" -ForegroundColor White
Write-Host "  → $TargetPath" -ForegroundColor Gray
