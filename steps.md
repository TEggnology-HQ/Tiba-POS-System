# POS Setup — Step by Step

## Server PC (Windows)

### Automated Way

#### Step 0 — Clone
```powershell
git clone https://github.com/TEggnology-HQ/Tiba-POS-System C:\Tiba-POS
```

#### Step 1 — Run `setup-wsl_WINDOWS.ps1` (as Admin)
Installs WSL 2 + Ubuntu and Docker Engine inside WSL. Then **restart**.

#### Step 2 — Run `setup-pos_WINDOWS.ps1` (as Admin)
Does everything else: passwords, firewall, clone into WSL, .env, docker compose, build tools, MSI build, auto-start.

After this the server is running, MSI is built, and both server + client auto-start on login.

---

### Manual Way

#### 1. WSL + Docker
```powershell
# PowerShell (as Admin):
wsl --install -d Ubuntu
wsl --set-default-version 2
# Restart PC
```

```bash
# Inside WSL (Ubuntu):
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
exit
# Re-open WSL
```

#### 2. Clone & Configure
```powershell
# Windows:
git clone https://github.com/TEggnology-HQ/Tiba-POS-System C:\Tiba-POS
```

```bash
# Inside WSL:
cd ~
git clone https://github.com/TEggnology-HQ/Tiba-POS-System POS
cd ~/POS
cp .env.example .env
nano .env          # change POSTGRES_PASSWORD and INITIAL_OWNER_PASSWORD
docker compose up -d
```

#### 3. Make Server Reachable (mDNS / Bonjour)

Client PCs access the server as `http://pos-server.local:3001`. To make `.local` names resolve on the LAN:

**Install Bonjour for Windows (5 MB):**
```powershell
# PowerShell (as Admin):
winget install Apple.BonjourPrintServices
# Or download from https://support.apple.com/kb/DL999
```

**Register `pos-server.local` temporarily** (for testing):
```powershell
dns-sd -R "Tiba POS" _http._tcp . 3001
# Keep this window open — pos-server.local:3001 is now live on the LAN
```

**Make it permanent** (auto-start on login):
Create a shortcut in `shell:startup` targeting:
```
C:\Windows\System32\dns-sd.exe -R "Tiba POS" _http._tcp . 3001
```

> The `dns-sd` command runs in the foreground, so the shortcut window stays open (minimized to tray).

#### 4. Firewall
```powershell
# PowerShell (as Admin):
C:\Tiba-POS\setup-firewall.ps1
```

#### 4.5. Port Proxy (LAN Access)
Docker runs inside WSL2, which uses NAT. Other PCs on the LAN can't reach it directly — you need a portproxy:

```powershell
# PowerShell (as Admin):
$wslIp = (wsl -- hostname -I).Trim()
netsh interface portproxy delete v4tov4 listenport=3001 listenaddress=0.0.0.0
netsh interface portproxy add v4tov4 listenport=3001 listenaddress=0.0.0.0 connectport=3001 connectaddress=$wslIp
```

Verify: `netsh interface portproxy show v4tov4`

> The portproxy is re-applied on each login via `start-server.ps1` (if using the automated setup), or add the above to a startup script.

#### 5. Build Client
```powershell
# Install prerequisites (as Admin):
winget install OpenJS.NodeJS.LTS
winget install Rustlang.Rustup
winget install Microsoft.VisualStudio.2022.BuildTools
# Then install C++ workload from VS installer

# Build:
cd C:\Tiba-POS\client
npm install
npm run tauri:build
# MSI at: src-tauri\target\release\bundle\msi\
```

#### 6. Auto-Start (Server)

**Bonjour mDNS (required for `pos-server.local`):**
Create a shortcut in `shell:startup` targeting:
```
C:\Windows\System32\dns-sd.exe -R "Tiba POS" _http._tcp . 3001
```

**Option A — Task Scheduler (recommended for Docker):**
```powershell
# PowerShell (as Admin):
$action = New-ScheduledTaskAction -Execute "wsl.exe" -Argument "-d Ubuntu -- sudo service docker start"
$trigger = New-ScheduledTaskTrigger -AtStartup
Register-ScheduledTask -TaskName "POS Docker" -Action $action -Trigger $trigger -RunLevel Highest -User SYSTEM

$action2 = New-ScheduledTaskAction -Execute "wsl.exe" -Argument "-d Ubuntu -- docker compose -f /home/<user>/POS/docker-compose.yml up -d"
$trigger2 = New-ScheduledTaskTrigger -AtStartup
Register-ScheduledTask -TaskName "POS Compose" -Action $action2 -Trigger $trigger2 -RunLevel Highest -User SYSTEM
```

**Option B — Shell:Startup:**
Create a shortcut in `shell:startup` targeting:
```
C:\Windows\System32\wsl.exe -d Ubuntu -- sudo service docker start
```
And another:
```
C:\Windows\System32\wsl.exe -d Ubuntu -- docker compose -f ~/POS/docker-compose.yml up -d
```

#### 7. Auto-Start (Client)
After installing the MSI, create a shortcut in `shell:startup` to `C:\Program Files\Tiba POS\Tiba POS.exe`

Or run: `C:\Tiba-POS\setup-startup.ps1`

---

## Client PCs

Copy the `.msi` from `C:\Tiba-POS\client\src-tauri\target\release\bundle\msi\` to each machine.

1. Run the `.msi` installer
2. Open app → Settings → Server URL: `http://pos-server.local:3001`
3. Test connection → Save
4. (Optional) Run `setup-startup.ps1` for auto-start

**Client PCs don't need:** WSL, Docker, Node.js, Rust, VS Build Tools, or any repo files.

---

## Scripts Reference

| Script | Purpose | Where to run |
|---|---|---|
| `setup-wsl_WINDOWS.ps1` | WSL + Docker Engine | Server PC, as Admin, then restart |
| `setup-pos_WINDOWS.ps1` | Everything else | Server PC, as Admin, after restart |
| `start-server.ps1` | Start Docker + containers | Auto-run via startup shortcut |
| `build-client.ps1` | Rebuild MSI standalone | Any Windows PC with build tools |
| `setup-startup.ps1` | Toggle client auto-start | Any client PC (optional) |
| `setup-firewall.ps1` | Open port 3001 | Server PC, as Admin |
| Bonjour for Windows | mDNS (`pos-server.local`) | Server PC — `winget install Apple.BonjourPrintServices` |
