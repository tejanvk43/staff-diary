# College Staff Daily Activity Recording System — Deployment Guide

## Overview

This is a **LAN-first** full-stack web application for recording college staff daily activities.  
No cloud dependency — runs fully offline on your local network.

| Component | Technology | Port |
|-----------|-----------|------|
| Backend   | Node.js + Express + MySQL | 5000 |
| Frontend  | React 18 + Vite + TailwindCSS | 3000 |
| Database  | MySQL 8 | 3306 |

---

## Prerequisites

- **Node.js** v18+ ([nodejs.org](https://nodejs.org))
- **MySQL 8** ([mysql.com](https://www.mysql.com))
- **npm** v8+

---

## Step 1 — MySQL Database Setup

1. Start MySQL server and log in:
   ```bash
   mysql -u root -p
   ```

2. Create the database and run schema:
   ```sql
   SOURCE /path/to/staff-diary/database/schema.sql;
   SOURCE /path/to/staff-diary/database/seed.sql;
   ```
   Or from command line:
   ```bash
   mysql -u root -p < database/schema.sql
   mysql -u root -p < database/seed.sql
   ```

---

## Step 2 — Backend Configuration

Edit `backend/.env`:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=college_diary
JWT_SECRET=a_long_random_string_at_least_32_chars_change_this
PORT=5000
NODE_ENV=production
```

> ⚠️ **Change `JWT_SECRET`** to a long random string before going live.

---

## Step 3 — Install Dependencies

```bash
# From project root (installs backend deps)
npm install

# Install frontend deps
cd frontend
npm install
cd ..
```

---

## Step 4 — Frontend LAN Configuration

Edit `frontend/.env`:

```env
VITE_API_URL=http://<SERVER_LAN_IP>:5000
```

Replace `<SERVER_LAN_IP>` with the actual IP of the server machine on the LAN.

**To find your LAN IP:**
- Windows: `ipconfig` → look for IPv4 Address under your network adapter
- Linux/Mac: `ip addr` or `ifconfig`

Example: `VITE_API_URL=http://192.168.1.10:5000`

---

## Step 5 — Start the Application

### Development Mode (recommended for initial setup)

**Option A — Run script (Windows):**
```
scripts\start-all.bat
```

**Option B — Run script (Linux/Mac):**
```bash
chmod +x scripts/start-all.sh
./scripts/start-all.sh
```

**Option C — Manual (two terminals):**

Terminal 1 (Backend):
```bash
npm start
# or: node backend/server.js
```

Terminal 2 (Frontend):
```bash
cd frontend
npm run dev
```

### Production Mode

```bash
# Build frontend
cd frontend
npm run build
cd ..

# Serve built frontend (install 'serve' if needed: npm i -g serve)
serve -s frontend/dist -l 3000 -H 0.0.0.0

# Backend
node backend/server.js
```

---

## Step 6 — Firewall Configuration

Allow incoming connections to ports **3000** and **5000** on the server machine.

**Windows Firewall (PowerShell as Admin):**
```powershell
New-NetFirewallRule -DisplayName "Staff Diary Backend" -Direction Inbound -Protocol TCP -LocalPort 5000 -Action Allow
New-NetFirewallRule -DisplayName "Staff Diary Frontend" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow
```

**Linux (ufw):**
```bash
sudo ufw allow 3000/tcp
sudo ufw allow 5000/tcp
```

---

## Step 7 — Access from Other Devices

On any device connected to the same LAN:

```
http://192.168.1.10:3000
```
(Replace with your server's actual IP)

---

## Default Login Credentials

| Field    | Value               |
|----------|---------------------|
| Email    | `admin@college.edu` |
| Password | `Admin@1234`        |
| Role     | Admin               |

> ⚠️ **Change the admin password immediately after first login!**

---

## First-Time Setup (After Login)

1. **System Config** — Review diary time window, max faculty settings
2. **Holidays** — Add your institution's academic year holidays  
3. **Departments** — Already seeded with common departments; add more as needed
4. **Add Faculty** — Use User Management to add staff individually or via Excel bulk upload
5. **Share credentials** — The system generates temporary passwords; share them with faculty

---

## Excel Bulk Upload Format

For bulk user upload, the Excel file must have these columns:

| Column         | Required | Values                    |
|----------------|----------|---------------------------|
| employee_id    | ✅       | Unique, e.g. `FAC001`    |
| full_name      | ✅       | Full name                 |
| email          | ✅       | Valid email               |
| education_type | ✅       | `B-Tech` or `Diploma`     |
| department     | ✅       | Department name           |
| role           | ✅       | `Faculty`, `HOD`, `Admin` |
| short_name     | ❌       | Abbreviated name          |
| designation    | ❌       | e.g. `Asst. Professor`   |
| phone_number   | ❌       | Phone number              |

---

## Architecture Notes

- Backend binds to `0.0.0.0` — accessible from all LAN interfaces
- Frontend Vite dev server uses `host: true` for LAN access
- JWT tokens expire in **8 hours** (re-login required)
- All time collision checks are **server-side** (client-side is UX hint only)
- System config values are read from `system_configs` table at runtime — no hardcoded values
- Notifications are polled every **30 seconds** by the frontend

---

## Troubleshooting

| Issue | Solution |
|-------|---------|
| `MySQL connected` not shown | Check DB_HOST, DB_USER, DB_PASSWORD in `.env` |
| Port already in use | Change PORT in `.env` or kill process using that port |
| Cannot access from other device | Check firewall rules; ensure devices are on same subnet |
| JWT invalid error | Clear browser localStorage and log in again |
| Frontend shows blank | Run `npm install` in `/frontend`, check `.env` API URL |
