# 🚀 POS System Deployment Guide (Windows)

This guide explains how to set up the POS system on a Windows machine to act as the server, and how to install the client application on other PCs.

## 🖥️ Part 1: Server Setup (The Host PC)

The "Server PC" is the machine that will run the database and the backend API.

### 1. Install Prerequisites
* **Docker Desktop**: Download and install [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/). Ensure you select the **WSL 2 backend** during installation.
* **Restart**: Restart your computer after installing Docker.

### 2. Network Configuration
To allow other computers to find this server using `http://pos-server.local:3001`:
1. **Change Computer Name**:
   * Go to **Settings** $\rightarrow$ **System** $\rightarrow$ **About**.
   * Click **Rename this PC**.
   * Change the name to `pos-server`.
   * **Restart** your computer.
2. **Open Firewall Port**:
   * Windows blocks incoming connections by default. You must open port `3001`.
   * Run the provided `setup-firewall.ps1` script as Administrator (see "Helper Scripts" section).

### 3. Launch the System
1. Open the project folder.
2. Create a `.env` file by copying `.env.example` and updating the passwords.
3. Open a terminal (PowerShell or CMD) in the project root.
4. Run the following command:
   ```powershell
   docker-compose up -d
   ```
   *This will download the database and server images, set up the database schema, and create the initial owner account.*

---

## 💻 Part 2: Client Setup (User PCs)

These are the computers used by cashiers and admins.

### 1. Installation
1. Copy the `POS_Installer.msi` file to the client PC.
2. Run the installer.

### 2. Connection
1. Launch the POS application.
2. Navigate to **Admin** $\rightarrow$ **Server Settings**.
3. Ensure the Server URL is set to: `http://pos-server.local:3001`.
4. Click **Test Connection**. If it fails, ensure both PCs are on the same Wi-Fi/LAN.
5. Click **Save**.

---

## 🛠️ Maintenance & Troubleshooting

### Restarting the Server
If you change the `.env` file, restart the containers:
```powershell
docker-compose restart
```

### Viewing Logs
To see what the server is doing:
```powershell
docker-compose logs -f server
```

### Database Backups
The database data is stored in a Docker Volume. To back up the data, you can use the `pg_dump` utility via the container:
```powershell
docker exec pos-db pg_dump -U postgres pos_db > backup.sql
```
