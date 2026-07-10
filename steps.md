Good catch — let me lay it out from absolute step zero.

## Full Workflow (Start to Finish)

### Step 0 — Clone the repo
On the **server PC** (Windows), do this first:
```powershell
git clone https://github.com/TEggnology-HQ/Tiba-POS-System C:\Tiba-POS
```
Now all the scripts (`setup-wsl.ps1`, `setup-pos.ps1`, `build-client.ps1`, `setup-startup.ps1`, `start-server.ps1`) are available at `C:\Tiba-POS\`.

Then:

---

### Step 1 — Run `setup-wsl.ps1` (as Admin)
This sets up the **Docker host**. It:
- Installs **WSL 2 + Ubuntu** (if missing)
- Installs **Docker Engine** inside WSL

After it finishes, it tells you to **restart**.

> **Why separate?** WSL install requires a reboot. A single script couldn't continue past the restart.

---

### Step 2 — Restart the PC
Needed for WSL to work.

---

### Step 3 — Run `setup-pos.ps1` (as Admin)
This does **everything else**:

| What | Why |
|---|---|
| Asks for passwords | Secures Postgres + admin account |
| Clones repo into WSL (`~/POS`) | Needed for Docker (better perf than `/mnt/c/`) |
| Creates `.env` | Fills in your passwords |
| `docker compose up -d` | Starts the server |
| Installs Node.js, Rust, VS Build Tools | Needed to build the Tauri client |
| Builds the MSI | Produces the client installer |
| Sets up auto-start | Server + client launch on boot |

After this, your **server PC is fully ready** — Postgres + API are running, MSI is built, everything starts automatically on boot.

---

### Step 4 — Distribute the MSI to client PCs
Grab the MSI from:
```
C:\Tiba-POS\client\src-tauri\target\release\bundle\msi\Tiba POS_1.0.0_x64_en-US.msi
```
Put it on a USB or network share. **Each client PC:**
1. Run the `.msi`
2. Open app → Settings → Server URL → `http://pos-server.local:3001`
3. Test connection → Save
4. (Optional) Run `setup-startup.ps1` if they want auto-start

---

### That's it. 4 steps.

The scripts automate everything except the initial `git clone`. Want me to build them out?



# 1. Clone
git clone https://github.com/TEggnology-HQ/Tiba-POS-System C:\Tiba-POS

# 2. Run as Administrator → installs WSL + Docker → tells you to restart
C:\Tiba-POS\setup-wsl.ps1

# 3. Restart PC

# 4. Run as Administrator → everything else (prompts for passwords, builds MSI, etc.)
C:\Tiba-POS\setup-pos.ps1
After step 4, the server is running, the MSI is built, and both server + client auto-start on login.
For Client PCs
Just copy the .msi from C:\Tiba-POS\client\src-tauri\target\release\bundle\msi\ and run it. Nothing else needed.
