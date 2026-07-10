# POS Setup — Step by Step

## Server PC (Windows)

### Step 0 — Clone the repo
```powershell
git clone https://github.com/TEggnology-HQ/Tiba-POS-System C:\Tiba-POS
```

---

### Step 1 — Run `setup-wsl_WINDOWS.ps1` (as Admin)
Installs **WSL 2 + Ubuntu** and **Docker Engine** inside WSL.
After it finishes, **restart your PC**.

---

### Step 2 — Restart

---

### Step 3 — Run `setup-pos_WINDOWS.ps1` (as Admin)
This does **everything else**:

| Phase | What | Notes |
|---|---|---|
| 1 | Asks for passwords | Postgres + admin account |
| 2 | Pre-checks | winget, WSL, Docker, project dir |
| 3 | Opens firewall port 3001 | So client PCs can reach the server |
| 4 | Clones repo into WSL (`~/POS`) | Better Docker performance |
| 5 | Creates `.env` | Uses your passwords |
| 6 | `docker compose up -d` | Starts Postgres + API server |
| 7 | Creates `start-server.ps1` | With your WSL paths baked in |
| 8 | Installs build tools | Node.js, Rust, VS Build Tools (via winget) |
| 9 | Builds the MSI | Produces the client installer |
| 10 | Auto-start server | `start-server.ps1` runs hidden on login |
| 11 | Auto-start client | Only if MSI is already installed |

After this, your **server PC is fully ready**:
- Postgres + API are running
- MSI is built at `C:\Tiba-POS\client\src-tauri\target\release\bundle\msi\`
- Server starts automatically on boot (background, hidden window)
- Client starts automatically on login (if MSI was installed)

---

### Step 4 — Distribute the MSI to client PCs
Copy the `.msi` to a USB or network share. **Each client PC:**
1. Run the `.msi` (takes ~10 seconds)
2. Open the app → Settings → Server URL → `http://pos-server.local:3001`
3. Test connection → Save
4. (Optional) Copy `setup-startup.ps1` from the server and run it if you want the POS to open on login

**Client PCs don't need:** WSL, Docker, Node.js, Rust, VS Build Tools, or any scripts besides the `.msi`.

---

## Scripts Reference

| Script | Purpose | Where to run |
|---|---|---|
| `setup-wsl_WINDOWS.ps1` | Phase 1 — WSL + Docker Engine | Server PC, as Admin, then restart |
| `setup-pos_WINDOWS.ps1` | Phase 2 — everything else | Server PC, as Admin, after restart |
| `start-server.ps1` | Start Docker + containers (auto-generated) | Auto-run via startup shortcut |
| `build-client.ps1` | Rebuild MSI (standalone, no config needed) | Any Windows PC with build tools |
| `setup-startup.ps1` | Toggle client auto-start on/off | Any client PC (optional) |
| `setup-firewall.ps1` | Open port 3001 in Windows Firewall | Integrated into setup-pos_WINDOWS.ps1 |


Sure. Here's the manual way from scratch on Windows:
Manual Setup (No Scripts)
1. WSL + Docker
# As Admin:
wsl --install -d Ubuntu
wsl --set-default-version 2
# Restart PC

# Inside WSL (Ubuntu):
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
exit
# Re-open WSL
2. Clone & Configure
# In Windows:
git clone https://github.com/TEggnology-HQ/Tiba-POS-System C:\Tiba-POS

# In WSL:
cd ~
git clone https://github.com/TEggnology-HQ/Tiba-POS-System POS
cd ~/POS
cp .env.example .env
nano .env  # change passwords
docker compose up -d
3. Open Firewall
# In Windows (as Admin):
C:\Tiba-POS\setup-firewall.ps1
4. Build Client
# Install: Node.js (winget install OpenJS.NodeJS.LTS)
# Install: Rust (winget install Rustlang.Rustup)
# Install: VS Build Tools with C++ workload

cd C:\Tiba-POS\client
npm install
npm run tauri:build
# MSI at: src-tauri\target\release\bundle\msi\
5. Auto-Start
Server — create C:\Users\<you>\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\Tiba Server.lnk targeting:
powershell.exe -WindowStyle Hidden -Command "wsl -d Ubuntu -- sudo service docker start; wsl -d Ubuntu -- docker compose -f ~/POS/docker-compose.yml up -d"
Client — create shell:startup shortcut to C:\Program Files\Tiba POS\Tiba POS.exe
6. Client PCs
Copy the .msi to each machine, install, point to http://pos-server.local:3001.
