<#
.SYNOPSIS
  Phase 2: Configures the server, builds the client, and sets up auto-start.
  Run this AFTER setup-wsl.ps1 + restart.
  Must be run as Administrator.
#>

param(
    [string]$WindowsProjectDir = "C:\Tiba-POS"
)

$ErrorActionPreference = "Stop"
$ScriptRoot = Split-Path -Parent $PSCommandPath

# ── helpers ──────────────────────────────────────────────────────────
function Step  { Write-Host "`n$('='*60)`n>>> $($args -join ' ')" -ForegroundColor Cyan }
function Ok    { Write-Host "  ✓ $($args -join ' ')" -ForegroundColor Green }
function Warn  { Write-Host "  ! $($args -join ' ')" -ForegroundColor Yellow }
function Fail  { Write-Host "  ✘ $($args -join ' ')" -ForegroundColor Red; exit 1 }

function Test-Command($Name) {
    try   { $null = Get-Command $Name -ErrorAction Stop; return $true }
    catch { return $false }
}

function Refresh-Path {
    $machine = [Environment]::GetEnvironmentVariable('Path', 'Machine')
    $user    = [Environment]::GetEnvironmentVariable('Path', 'User')
    $env:Path = "$machine;$user;$env:Path"
}

function Prompt-Password($Label) {
    $pass1 = Read-Host "$Label" -AsSecureString
    $pass2 = Read-Host "Confirm $Label" -AsSecureString
    $bstr1 = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($pass1)
    $bstr2 = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($pass2)
    $plain1 = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr1)
    $plain2 = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr2)
    if ($plain1 -ne $plain2) { Fail "Passwords do not match." }
    if ([string]::IsNullOrWhiteSpace($plain1)) { Fail "Password cannot be empty." }
    return $plain1
}

$IsAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent())
    .IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

# ── ensure admin ────────────────────────────────────────────────────
if (-not $IsAdmin) {
    Fail "Run this script as Administrator (right-click → Run as Administrator)."
}

# =====================================================================
# PHASE 1 — COLLECT CONFIGURATION
# =====================================================================
Step "Configuration"
Write-Host "We need a few details to set up the POS system.`n" -ForegroundColor White

$repoUrl   = "https://github.com/TEggnology-HQ/Tiba-POS-System"
$wslDistro = Read-Host "WSL distribution name" -Default "Ubuntu"
$wslPath   = Read-Host "Project path inside WSL" -Default "~/POS"
$adminUser = Read-Host "Initial admin username" -Default "admin"

Write-Host "`n── Set passwords ──" -ForegroundColor Yellow
Write-Host "  • PostgreSQL password: used for the database (change from default!)"
Write-Host "  • Admin password: used to log into the POS app (change from default!)`n"
$pgPassword  = Prompt-Password "PostgreSQL password"
$adminPass   = Prompt-Password "Admin password"

Write-Host @"

  ┌─────────────────────────────────────────────┐
  │  Repo:   $repoUrl
  │  WSL:    $wslDistro
  │  WSL →   $wslPath
  │  Admin:  $adminUser / ********
  │  DB:     postgres / ********
  └─────────────────────────────────────────────┘
"@ -ForegroundColor Cyan
$confirm = Read-Host "Proceed with these settings? (Y/n)"
if ($confirm -eq "n" -or $confirm -eq "N") {
    Fail "Cancelled by user."
}

# =====================================================================
# PHASE 2 — OPEN FIREWALL PORT 3001
# =====================================================================
Step "Opening firewall port 3001"
$fwScript = "$WindowsProjectDir\setup-firewall.ps1"
if (Test-Path $fwScript) {
    & $fwScript
    if ($LASTEXITCODE -ne 0) { Warn "Firewall rule may already exist or failed — continuing anyway." }
    Ok "Firewall port 3001 opened"
} else {
    # Manual fallback
    Warn "setup-firewall.ps1 not found — creating rule manually..."
    Remove-NetFirewallRule -DisplayName "POS_Server_Port_3001" -ErrorAction SilentlyContinue
    New-NetFirewallRule -DisplayName "POS_Server_Port_3001" `
                        -Direction Inbound `
                        -LocalPort 3001 `
                        -Protocol TCP `
                        -Action Allow `
                        -Description "Allows incoming traffic for the POS Server API"
    Ok "Firewall port 3001 opened"
}

# =====================================================================
# PHASE 3 — CLONE REPO INTO WSL
# =====================================================================
Step "Cloning repo into WSL"
wsl -d $wslDistro -- bash -c "
    if [ -d '$wslPath/.git' ]; then
        echo 'Repo already exists — pulling latest...'
        cd '$wslPath' && git pull
    else
        echo 'Cloning...'
        git clone '$repoUrl' '$wslPath'
    fi
"
if ($LASTEXITCODE -ne 0) { Fail "Failed to clone/pull repo inside WSL." }
Ok "Repo ready at $wslPath"

# =====================================================================
# PHASE 4 — CREATE .ENV
# =====================================================================
Step "Creating .env file"

# Also copy .env to Windows for reference
$windowsEnvPath = "$WindowsProjectDir\.env"
@"
# Database Configuration
POSTGRES_USER=postgres
POSTGRES_PASSWORD=$pgPassword
POSTGRES_DB=pos_db

# Server Configuration
PORT=3001
NODE_ENV=production

# Initial Admin Account (Created on first launch)
INITIAL_OWNER_USERNAME=$adminUser
INITIAL_OWNER_PASSWORD=$adminPass
"@ | Out-File -FilePath $windowsEnvPath -Encoding utf8 -Force
Ok ".env written to Windows: $windowsEnvPath"

# Write .env into WSL
$envContent = @"
POSTGRES_USER=postgres
POSTGRES_PASSWORD=$pgPassword
POSTGRES_DB=pos_db
PORT=3001
NODE_ENV=production
INITIAL_OWNER_USERNAME=$adminUser
INITIAL_OWNER_PASSWORD=$adminPass
"@
wsl -d $wslDistro -- bash -c "cat > '$wslPath/.env' << 'ENVEOF'
$envContent
ENVEOF"
if ($LASTEXITCODE -ne 0) { Fail "Failed to write .env inside WSL." }
Ok ".env written to WSL: $wslPath/.env"

# =====================================================================
# PHASE 5 — START DOCKER CONTAINERS
# =====================================================================
Step "Starting Docker containers"
Write-Host "Starting Docker daemon..." -ForegroundColor White
wsl -d $wslDistro -- sudo service docker start
Start-Sleep 3

Write-Host "Running docker compose up -d..." -ForegroundColor White
wsl -d $wslDistro -- bash -c "cd '$wslPath' && docker compose up -d"
if ($LASTEXITCODE -ne 0) { Fail "docker compose failed." }

Write-Host "Verifying containers..." -ForegroundColor White
Start-Sleep 3
wsl -d $wslDistro -- docker ps --format "table {{.Names}}\t{{.Status}}"
Ok "Server containers are running"

# =====================================================================
# PHASE 6 — CREATE START-SERVER.PS1
# =====================================================================
Step "Creating start-server.ps1"
$serverScript = @"
<#
.SYNOPSIS
  Starts Docker Engine in WSL and launches POS server containers.
  Auto-generated by setup-pos.ps1 — do not edit manually.
#>

`$WslDistro  = "$wslDistro"
`$WslPath    = "$wslPath"

Write-Host "Starting Docker in WSL..." -ForegroundColor Cyan
wsl -d `$WslDistro -- sudo service docker start
Start-Sleep 3

Write-Host "Launching containers..." -ForegroundColor Cyan
wsl -d `$WslDistro -- bash -c "cd '`$WslPath' && docker compose up -d"

if (`$LASTEXITCODE -eq 0) {
    Write-Host "✓ POS server is running" -ForegroundColor Green
} else {
    Write-Host "! Failed to start containers." -ForegroundColor Red
}
"@
$serverScriptPath = "$WindowsProjectDir\start-server.ps1"
$serverScript | Out-File -FilePath $serverScriptPath -Encoding utf8 -Force
Ok "Created $serverScriptPath"

# =====================================================================
# PHASE 7 — INSTALL WINDOWS BUILD TOOLS
# =====================================================================
Step "Installing Windows build tools (Node.js, Rust, VS Build Tools)"

# ── 7a. Node.js ──
Write-Host "Checking Node.js..." -ForegroundColor White
if (Test-Command node) {
    Ok "Node.js $(node --version) already installed"
} else {
    Warn "Installing Node.js via winget..."
    winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
    if ($LASTEXITCODE -ne 0) { Fail "Node.js installation failed." }
    Refresh-Path
    if (-not (Test-Command node)) { Fail "Node.js not found after install. Restart terminal and re-run." }
    Ok "Node.js $(node --version) installed"
}

# ── 7b. Rust ──
Write-Host "Checking Rust..." -ForegroundColor White
if (Test-Command rustc) {
    Ok "Rust $(rustc --version) already installed"
} else {
    Warn "Installing Rust via winget..."
    winget install Rustlang.Rustup --accept-package-agreements --accept-source-agreements
    if ($LASTEXITCODE -ne 0) { Fail "Rustup installation failed." }
    Refresh-Path
    Start-Sleep 3
    if (-not (Test-Command rustc)) { Fail "Rust not found after install. Restart terminal and re-run." }
    Ok "Rust $(rustc --version) installed"
}

# ── 7c. VS Build Tools ──
Write-Host "Checking Visual Studio Build Tools..." -ForegroundColor White
$clPaths = @(
    "$env:ProgramFiles\Microsoft Visual Studio\2022\BuildTools\VC\Tools\MSVC\*\bin\Hostx64\x64\cl.exe",
    "${env:ProgramFiles(x86)}\Microsoft Visual Studio\2022\BuildTools\VC\Tools\MSVC\*\bin\Hostx64\x64\cl.exe",
    "$env:ProgramFiles\Microsoft Visual Studio\2022\Community\VC\Tools\MSVC\*\bin\Hostx64\x64\cl.exe",
    "${env:ProgramFiles(x86)}\Microsoft Visual Studio\2022\Community\VC\Tools\MSVC\*\bin\Hostx64\x64\cl.exe",
    "$env:ProgramFiles\Microsoft Visual Studio\2022\Professional\VC\Tools\MSVC\*\bin\Hostx64\x64\cl.exe",
    "$env:ProgramFiles\Microsoft Visual Studio\2022\Enterprise\VC\Tools\MSVC\*\bin\Hostx64\x64\cl.exe"
)
$clFound = $false
foreach ($pattern in $clPaths) {
    $matches = Resolve-Path $pattern -ErrorAction SilentlyContinue
    if ($matches) { $clFound = $true; break }
}
if ($clFound) {
    Ok "VS Build Tools (C++ compiler) already installed"
} else {
    Warn "Installing VS Build Tools with C++ workload..."
    winget install Microsoft.VisualStudio.2022.BuildTools --accept-package-agreements --accept-source-agreements
    if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne 3010) { Fail "VS Build Tools installation failed." }

    # Install C++ workload
    $vsInstaller = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vs_installer.exe"
    if (-not (Test-Path $vsInstaller)) {
        Warn "Downloading Visual Studio installer..."
        $url = "https://aka.ms/vs/17/release/vs_buildtools.exe"
        $out = "$env:TEMP\vs_buildtools.exe"
        Invoke-WebRequest -Uri $url -OutFile $out
        $vsInstaller = $out
    }

    Write-Host "Installing C++ workload (this takes a few minutes)..." -ForegroundColor Yellow
    $proc = Start-Process -FilePath $vsInstaller -ArgumentList @(
        "modify",
        "--installPath", "$env:ProgramFiles\Microsoft Visual Studio\2022\BuildTools",
        "--add", "Microsoft.VisualStudio.Workload.VCTools",
        "--includeRecommended",
        "--quiet",
        "--norestart"
    ) -Wait -PassThru -NoNewWindow

    if ($proc.ExitCode -ne 0 -and $proc.ExitCode -ne 3010) {
        Fail "C++ workload installation failed (exit code $($proc.ExitCode))."
    }
    Ok "VS Build Tools with C++ workload installed"
}

# ── 7d. WebView2 check ──
$webview = Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}" -ErrorAction SilentlyContinue
if ($webview) {
    Ok "WebView2 found"
} else {
    Warn "WebView2 should be pre-installed on Windows 10/11. If the build fails, download from https://developer.microsoft.com/en-us/microsoft-edge/webview2/"
}

# =====================================================================
# PHASE 8 — BUILD TAURI CLIENT
# =====================================================================
Step "Building Tauri client"
$clientDir = "$WindowsProjectDir\client"
if (-not (Test-Path $clientDir)) {
    Fail "Client directory not found at $clientDir. Is the repo cloned?"
}

Write-Host "Installing npm dependencies..." -ForegroundColor White
Push-Location $clientDir
try {
    npm install
    if ($LASTEXITCODE -ne 0) { Fail "npm install failed." }
    Ok "Dependencies installed"

    Write-Host "Building Tauri application..." -ForegroundColor White
    npm run tauri:build
    if ($LASTEXITCODE -ne 0) { Fail "Tauri build failed." }
} finally {
    Pop-Location
}

# Locate MSI
$msi = Get-ChildItem "$clientDir\src-tauri\target\release\bundle\msi\*.msi" -ErrorAction SilentlyContinue |
       Select-Object -First 1
if ($msi) {
    Write-Host @"

  ┌────────────────────────────────────────────────────────────┐
  │  ✅ MSI built successfully!                                │
  │                                                            │
  │  Location: $($msi.FullName)
  │  Size:     $('{0:N1} MB' -f ($msi.Length / 1MB))
  │                                                            │
  │  Copy this .msi to client PCs and run it.                  │
  └────────────────────────────────────────────────────────────┘
"@ -ForegroundColor Green
} else {
    Warn "Could not locate MSI. Check $clientDir\src-tauri\target\release\bundle\msi\"
}

# =====================================================================
# PHASE 9 — SET UP AUTO-START (SERVER)
# =====================================================================
Step "Setting up auto-start (server)"
$serverLnkPath = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup\Tiba Server.lnk"
$WScriptShell = New-Object -ComObject WScript.Shell
$shortcut = $WScriptShell.CreateShortcut($serverLnkPath)
$shortcut.TargetPath = "powershell.exe"
$shortcut.Arguments = "-WindowStyle Hidden -File ""$WindowsProjectDir\start-server.ps1"""
$shortcut.Description = "Tiba POS — starts Docker + server containers"
$shortcut.WorkingDirectory = "$WindowsProjectDir"
$shortcut.Save()
Ok "Server auto-start added: $serverLnkPath"

# =====================================================================
# PHASE 10 — SET UP AUTO-START (CLIENT)
# =====================================================================
Step "Setting up auto-start (client)"
$clientExe = "C:\Program Files\Tiba POS\Tiba POS.exe"
$clientLnkPath = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup\Tiba POS.lnk"
if (Test-Path $clientExe) {
    $shortcut2 = $WScriptShell.CreateShortcut($clientLnkPath)
    $shortcut2.TargetPath = $clientExe
    $shortcut2.Description = "Tiba POS — Point of Sale System"
    $shortcut2.WorkingDirectory = "C:\Program Files\Tiba POS"
    $shortcut2.Save()
    Ok "Client auto-start added: $clientLnkPath"
} else {
    Warn "Client executable not found at $clientExe"
    Warn "Install the MSI first, then re-run this script to enable client auto-start."
    Warn "Or manually create a shortcut in shell:startup pointing to the installed POS."
}

# =====================================================================
# DONE
# =====================================================================
Step "Setup complete!"
Write-Host @"

  ┌────────────────────────────────────────────────────────────┐
  │  ✅ POS system is ready!                                   │
  │                                                            │
  │  Server:     http://pos-server.local:3001                   │
  │  Docker:     running inside WSL ($wslDistro)
  │  MSI:        $($msi.FullName -replace "^$([regex]::Escape($WindowsProjectDir))", "C:\Tiba-POS")
  │  Auto-start: ✓ Server  (hides on login, runs in background)
  │               ⚠ Client  (enable by installing MSI + re-run)
  │                                                            │
  │  What next?                                                │
  │  1. Open the POS app on this PC (or distribute the MSI)    │
  │  2. Go to Admin → Server Settings                          │
  │  3. Server URL: http://pos-server.local:3001                │
  │  4. Test connection → Save                                 │
  │                                                            │
  │  Client PCs just need the .msi file — nothing else.        │
  │  (Optional: copy setup-startup.ps1 to client PCs if       │
  │   you want the POS app to open on login there too.)        │
  └────────────────────────────────────────────────────────────┘
"@ -ForegroundColor Green

Read-Host "`nPress Enter to exit"
