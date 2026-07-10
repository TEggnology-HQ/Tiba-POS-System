<#
.SYNOPSIS
  Builds the POS Tauri client on Windows with auto-install of prerequisites.
.DESCRIPTION
  Checks for Node.js, Rust, and VS Build Tools — installs any missing via winget.
  Then runs npm install + tauri build and outputs the MSI path.
.PARAMETER NoInstall
  Skip auto-install; only check prerequisites and abort if anything is missing.
.PARAMETER NoBuild
  Only install prerequisites, skip the Tauri build.
.EXAMPLE
  .\build-client.ps1
  .\build-client.ps1 -NoInstall
  .\build-client.ps1 -NoBuild
#>

param(
    [switch]$NoInstall,
    [switch]$NoBuild
)

$ErrorActionPreference = "Stop"
$ScriptRoot = Split-Path -Parent $PSCommandPath

# ── helpers ──────────────────────────────────────────────────────────
function Step  { Write-Host "`n>>> $($args -join ' ')" -ForegroundColor Cyan }
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

$IsAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent())
    .IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

# ── 1. Node.js ───────────────────────────────────────────────────────
Step "Checking Node.js"
if (Test-Command node) {
    Ok "Node.js $(node --version)"
} elseif ($NoInstall) {
    Fail "Node.js is required. Install from https://nodejs.org or re-run without -NoInstall."
} else {
    Warn "Not found — installing via winget..."
    winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
    if ($LASTEXITCODE -ne 0) { Fail "Node.js installation failed." }
    Refresh-Path
    if (-not (Test-Command node)) { Fail "Node.js still not found after install. Restart terminal and re-run." }
    Ok "Node.js $(node --version) installed"
}

# ── 2. Rust ──────────────────────────────────────────────────────────
Step "Checking Rust"
if (Test-Command rustc) {
    Ok "Rust $(rustc --version)"
} elseif ($NoInstall) {
    Fail "Rust is required. Install from https://rustup.rs or re-run without -NoInstall."
} else {
    Warn "Not found — installing via winget..."
    winget install Rustlang.Rustup --accept-package-agreements --accept-source-agreements
    if ($LASTEXITCODE -ne 0) { Fail "Rustup installation failed." }
    # rustup installs stable toolchain and sets PATH
    Refresh-Path
    # Give rustup a moment
    Start-Sleep 3
    if (-not (Test-Command rustc)) { Fail "Rust still not found. Restart terminal and re-run." }
    Ok "Rust $(rustc --version) installed"
}

# ── 3. Visual Studio Build Tools (C++ workload) ─────────────────────
Step "Checking Visual Studio Build Tools"
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
    if ($matches) {
        $clFound = $true
        break
    }
}

if ($clFound) {
    Ok "Visual Studio Build Tools (C++ compiler found)"
} elseif ($NoInstall) {
    Fail "Visual Studio Build Tools with C++ workload are required."
} else {
    Warn "Not found — installing Build Tools with C++ workload via winget..."
    # Install Build Tools
    winget install Microsoft.VisualStudio.2022.BuildTools --accept-package-agreements --accept-source-agreements
    if ($LASTEXITCODE -ne 0) { Fail "VS Build Tools installation failed." }

    # Install C++ workload via VS installer
    $vsInstaller = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vs_installer.exe"
    if (-not (Test-Path $vsInstaller)) {
        # Try to download it
        Warn "vs_installer.exe not found — downloading..."
        $url = "https://aka.ms/vs/17/release/vs_buildtools.exe"
        $out = "$env:TEMP\vs_buildtools.exe"
        Invoke-WebRequest -Uri $url -OutFile $out
        $vsInstaller = $out
    }

    Step "Installing C++ workload (this may take a while)..."
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
    # 3010 means success + restart required
    Ok "Visual Studio Build Tools with C++ workload installed"
}

# ── 4. WebView2 ──────────────────────────────────────────────────────
Step "Checking WebView2"
$webview = Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}" -ErrorAction SilentlyContinue
if ($webview -or (Test-Path "$env:ProgramFiles (x86)\Microsoft\EdgeWebView\Application")) {
    Ok "WebView2 found"
} else {
    Warn "WebView2 not found — should be pre-installed on Windows 10/11."
    Warn "If not, download from https://developer.microsoft.com/en-us/microsoft-edge/webview2/"
}

# ── 5. npm install ──────────────────────────────────────────────────
Step "Installing npm dependencies"
Push-Location "$ScriptRoot\client"
try {
    npm install
    if ($LASTEXITCODE -ne 0) { Fail "npm install failed." }
    Ok "Dependencies installed"
} finally {
    Pop-Location
}

# ── 6. Tauri build ─────────────────────────────────────────────────
if (-not $NoBuild) {
    Step "Building Tauri application (this will take a while on first run)..."
    Push-Location "$ScriptRoot\client"
    try {
        npm run tauri:build
        if ($LASTEXITCODE -ne 0) { Fail "Tauri build failed." }
    } finally {
        Pop-Location
    }

    # ── 7. Locate MSI ──────────────────────────────────────────────
    Step "Locating built MSI"
    $msi = Get-ChildItem "$ScriptRoot\client\src-tauri\target\release\bundle\msi\*.msi" -ErrorAction SilentlyContinue |
           Select-Object -First 1
    if ($msi) {
        Ok "MSI built successfully!"
        Write-Host "  Location: $($msi.FullName)" -ForegroundColor Green
        Write-Host "  Size:     $('{0:N1} MB' -f ($msi.Length / 1MB))" -ForegroundColor Green
    } else {
        Warn "Could not find MSI at the expected path."
        Warn "Check client\src-tauri\target\release\bundle\msi\ for the installer."
    }
} else {
    Step "Skipping build (-NoBuild specified)"
}

Step "Done!"
