<#
.SYNOPSIS
  Phase 1: Installs WSL 2 + Ubuntu and Docker Engine on Windows.
  Run this as Administrator on the server PC, then restart.
  After restart, run setup-pos.ps1 to continue.
#>

param(
    [string]$WslDistro = "Ubuntu"
)

$ErrorActionPreference = "Stop"

# ── helpers ──────────────────────────────────────────────────────────
function Step { Write-Host "`n>>> $($args -join ' ')" -ForegroundColor Cyan }
function Ok   { Write-Host "  ✓ $($args -join ' ')" -ForegroundColor Green }
function Warn { Write-Host "  ! $($args -join ' ')" -ForegroundColor Yellow }
function Fail { Write-Host "  ✘ $($args -join ' ')" -ForegroundColor Red; exit 1 }

$IsAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent())
    .IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

# ── check admin ─────────────────────────────────────────────────────
if (-not $IsAdmin) {
    Fail "Run this script as Administrator (right-click → Run as Administrator)."
}

# ── 1. Check / Install WSL 2 ────────────────────────────────────────
Step "Checking WSL"
$wslStatus = & wsl --status 2>&1
if ($LASTEXITCODE -ne 0) {
    Warn "WSL not installed. Installing WSL 2..."
    wsl --install -d $WslDistro
    if ($LASTEXITCODE -ne 0) { Fail "WSL installation failed." }
    Warn "WSL installed — a restart is required."
    Warn "After restart, run setup-pos.ps1 to continue."
    Read-Host "`nPress Enter to exit"
    exit 0
}

# If we get here, WSL is installed. Check if our distro exists.
Step "Checking WSL distro '$WslDistro'"
$distros = & wsl --list --quiet 2>$null | ForEach-Object { $_.Trim() }
if ($distros -notcontains $WslDistro) {
    Warn "Distro '$WslDistro' not found. Installing..."
    wsl --install -d $WslDistro
    if ($LASTEXITCODE -ne 0) { Fail "Failed to install distro." }
    # Newly installed distro requires a restart
    Warn "Restart required. After restart, run setup-pos.ps1 again."
    Read-Host "`nPress Enter to exit"
    exit 0
}

Ok "WSL 2 + '$WslDistro' is ready"

# ── 2. Ensure WSL 2 mode ────────────────────────────────────────────
Step "Ensuring WSL 2 mode"
wsl --set-version $WslDistro 2 2>$null
Ok "WSL 2 mode confirmed"

# ── 3. Install Docker Engine inside WSL ──────────────────────────────
Step "Installing Docker Engine inside WSL"
$dockerCheck = & wsl -d $WslDistro -- which docker 2>&1
if ($LASTEXITCODE -eq 0) {
    Ok "Docker is already installed in WSL"
} else {
    Warn "Docker not found — installing..."
    wsl -d $WslDistro -- bash -c "
        curl -fsSL https://get.docker.com | sh
    "
    if ($LASTEXITCODE -ne 0) { Fail "Docker installation failed." }

    Step "Adding current user to docker group"
    $wslUser = & wsl -d $WslDistro -- whoami
    wsl -d $WslDistro -- sudo usermod -aG docker $wslUser
    Ok "Docker installed and user '$wslUser' added to docker group"
}

# ── 4. Start Docker and verify ───────────────────────────────────────
Step "Starting Docker and verifying"
wsl -d $WslDistro -- sudo service docker start
Start-Sleep 3
$verification = & wsl -d $WslDistro -- docker info 2>&1
if ($LASTEXITCODE -eq 0) {
    Ok "Docker Engine is running"
} else {
    Warn "Docker Engine installed but not running. You may need to restart first."
    Warn "Run 'wsl -d $WslDistro -- sudo service docker start' after restart."
}

# ── done ─────────────────────────────────────────────────────────────
Step "Setup WSL complete!"
Write-Host @"

  What's next?
  ──────────────────────────────────────────────
  1. Restart your PC
  2. Run setup-pos.ps1 (as Administrator) to:
       - Clone the repo into WSL
       - Configure passwords
       - Start the server (Docker compose)
       - Build the Tauri client (MSI)
       - Set up auto-start
  ──────────────────────────────────────────────
"@ -ForegroundColor Green
Read-Host "`nPress Enter to exit"
