# 📒 College Staff Daily Activity Recording System — Project Overview

> **Tech Stack:** Node.js + Express + MySQL (backend) · React 18 + Vite (frontend)
> **Deployment:** LAN-first, offline-capable; no cloud dependency
> **Ports:** Backend `5000` · Frontend `3000` · MySQL `3306`

---

## 📁 Directory Structure

```
staff-diary/
├── backend/
│   ├── server.js                          ← Express app entry point (binds 0.0.0.0:5000)
│   ├── .env                               ← DB creds, JWT secret, PORT
│   └── src/
│       ├── config/
│       │   ├── config.js                  ← Reads .env and exports constants
│       │   └── db.js                      ← mysql2 connection pool
│       ├── middleware/
│       │   ├── auth.js                    ← JWT verification (header + ?token= query fallback)
│       │   └── role.js                    ← Role-based access guard (Admin/HOD/Faculty)
│       ├── controllers/
│       │   ├── authController.js          ← login, changePassword, me
│       │   ├── userController.js          ← CRUD users (incl. delete), bulk Excel, reset pwd
│       │   ├── diaryController.js         ← diary CRUD, submit, auto-populate, edit requests
│       │   ├── timetableController.js     ← timetable slot CRUD (server-side collision check)
│       │   ├── requestController.js       ← leave, OD, extra hours, edit requests
│       │   ├── approvalsController.js     ← approve/reject leave/OD/extra/diary/edit requests
│       │   ├── attendanceController.js    ← attendance CRUD + summary
│       │   ├── reportsController.js       ← diary/attendance/leave/conflicts reports + Excel
│       │   ├── adminController.js         ← config, holidays, dept CRUD, subject CRUD
│       │   └── notificationsController.js ← list, mark-individual, mark-all-read
│       ├── routes/
│       │   ├── auth.js                    ← POST /login, POST /change-password, GET /me
│       │   ├── users.js                   ← GET/POST/PUT/DELETE /admin/users, bulk, reset-pwd
│       │   ├── diary.js                   ← CRUD /diary, submit, request-edit
│       │   ├── timetable.js               ← CRUD /timetable
│       │   ├── requests.js                ← leave, OD, extra-hours routes
│       │   ├── approvals.js               ← /admin/approvals/* routes (incl. diary)
│       │   ├── attendance.js              ← /attendance CRUD + summary
│       │   ├── reports.js                 ← /reports/* routes
│       │   ├── notifications.js           ← /notifications routes
│       │   └── admin.js                   ← config, holidays, dept CRUD, subject CRUD
│       └── utils/
│           ├── excelParser.js             ← xlsx read/write helpers
│           ├── passwordGen.js             ← temp password generator
│           └── timeConflict.js            ← server-side time overlap checker
│
├── frontend/
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json                       ← jspdf removed; clean deps
│   ├── .env                               ← VITE_API_URL=http://<LAN_IP>:5000
│   └── src/
│       ├── main.jsx                       ← React entry point
│       ├── App.jsx                        ← Router + AuthProvider + Toaster (all routes)
│       ├── index.css                      ← Global design system (CSS variables, utilities)
│       ├── api/
│       │   └── axios.js                   ← Axios instance with base URL + JWT interceptor
│       ├── hooks/
│       │   ├── useAuth.jsx                ← AuthContext (login/logout, user state, localStorage)
│       │   └── useNotifications.js        ← Poll notifications every 30s, markRead support
│       ├── components/
│       │   ├── AppLayout.jsx              ← Sidebar + main content wrapper
│       │   ├── Sidebar.jsx                ← Role-aware navigation (Faculty/HOD/Admin nav arrays)
│       │   ├── NotificationBell.jsx       ← Dropdown bell with per-item mark-read
│       │   └── ProtectedRoute.jsx         ← Guards routes by auth + optional role check
│       └── pages/
│           ├── LoginPage.jsx              ← Login form with first-login redirect
│           ├── ChangePasswordPage.jsx     ← Forced first-login password change
│           ├── ProfilePage.jsx            ← View/edit own profile + change password
│           ├── Faculty/
│           │   ├── FacultyDashboard.jsx   ← Daily diary (add/edit/delete/submit, date nav)
│           │   ├── DiaryHistoryPage.jsx   ← Date-range diary history (grouped, collapsible)
│           │   ├── TimetablePage.jsx      ← Weekly schedule, slot CRUD
│           │   ├── LeaveRequestPage.jsx   ← Leave application form
│           │   ├── ODRequestPage.jsx      ← On-Duty request form
│           │   ├── ExtraHoursPage.jsx     ← Extra hours logging form
│           │   └── MyRequestsPage.jsx     ← Personal request history (all types)
│           └── Admin/
│               ├── UserManagementPage.jsx ← Staff directory, add/edit/delete user, bulk upload + pwd download
│               ├── ApprovalsPage.jsx      ← Tabbed queue (Leave/OD/Extra/Diary/Edit) with Review modal
│               ├── AttendancePage.jsx     ← Daily attendance view + Mark Attendance modal
│               ├── ConflictsPage.jsx      ← Timetable room/slot conflict detector
│               ├── ReportsPage.jsx        ← Diary/Attendance/Leave/Conflict reports + Excel (blob download)
│               ├── SystemConfigPage.jsx   ← System-wide settings (5 config keys)
│               ├── SubjectsPage.jsx       ← Subject catalogue CRUD (add/edit/delete)
│               ├── DepartmentsPage.jsx    ← Department management CRUD
│               └── HolidaysPage.jsx       ← Holiday CRUD calendar
│
├── database/
│   ├── schema.sql                         ← Full MySQL 8 schema (13 tables)
│   └── seed.sql                           ← Default admin account, departments, system_configs
│
├── scripts/
│   ├── start-all.bat                      ← Windows: starts backend + frontend concurrently
│   └── start-all.sh                       ← Linux/Mac equivalent
│
├── package.json                           ← Root (backend) package
├── PROJECT_OVERVIEW.md                    ← This file
└── README_DEPLOY.md                       ← Full deployment guide
```

---

## 🗄️ Database Schema (13 Tables)

| # | Table | Purpose |
|---|-------|---------|
| 1 | `departments` | Department master (name, code, HOD) |
| 2 | `users` | All staff — Faculty, HOD, Admin; bcrypt hash, role, first-login flag |
| 3 | `subjects` | Subject catalogue (code, name, type, year, semester, dept) |
| 4 | `timetables` | Per-faculty weekly schedule slots (day, time, room, subject FK) |
| 5 | `holidays` | Academic year holiday calendar |
| 6 | `extra_hours` | Faculty extra work logging (Pending → Approved/Rejected) |
| 7 | `on_duty_requests` | OD applications with session type (FN/AN/Full Day) |
| 8 | `leave_requests` | Leave applications (Sick/Casual/Permission/Emergency/Other) |
| 9 | `request_detail_changes` | Diary edit requests with edit window expiry |
| 10 | `diary_logs` | Core diary entries (Draft → Submitted → Approved/Rejected) |
| 11 | `attendance` | Daily attendance records (Present/Absent/Leave/OD/Holiday) |
| 12 | `notifications` | In-app notification feed (polled every 30s) |
| 13 | `system_configs` | Runtime key-value config (diary times, max faculty, edit window) |

---

## 🌐 API Endpoints (Complete)

### Auth — `/api/auth`
| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| POST | `/login` | Public | Email + password → JWT token |
| POST | `/change-password` | All | Change own password |
| GET | `/me` | All | Fetch own profile |

### Users — `/api/admin/users`
| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| GET | `/` | Admin | List all users |
| POST | `/` | Admin | Create single user (returns temp password) |
| POST | `/bulk` | Admin | Bulk create from Excel file |
| GET | `/:employee_id` | Admin | Get single user |
| PUT | `/:employee_id` | Admin | Update user profile |
| DELETE | `/:employee_id` | Admin | Delete user |
| PUT | `/:employee_id/reset-password` | Admin | Generate new temp password |

### Diary — `/api/diary`
| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| GET | `/today` | All | Today's entries; auto-populates from timetable |
| GET | `/?date=YYYY-MM-DD` | All | Entries for a past date |
| POST | `/` | All | Create draft entry |
| PUT | `/:id` | All | Update entry |
| DELETE | `/:id` | All | Delete draft entry |
| POST | `/:id/submit` | All | Submit single draft entry |
| POST | `/submit-day` | All | Submit all today's drafts |
| POST | `/request-edit` | All | Request permission to edit a past entry |

### Timetable — `/api/timetable`
| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| GET | `/mine` | All | Own timetable slots |
| POST | `/` | All | Add slot (server-side collision check) |
| PUT | `/:id` | All | Update slot (server-side collision check) |
| DELETE | `/:id` | All | Remove slot |

### Attendance — `/api/attendance`
| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| GET | `/` | All | Attendance records (role-filtered, date/dept filter) |
| GET | `/summary` | All | Aggregated summary per employee |
| POST | `/` | Admin/HOD | Mark/upsert attendance record |
| PUT | `/:id` | Admin/HOD | Update attendance record |

### Requests — `/api/requests`
| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| POST | `/leave` | All | Apply for leave (future dates only) |
| GET | `/leave` | All/HOD/Admin | Fetch leaves (role-filtered) |
| POST | `/od` | All | Apply for OD |
| GET | `/od` | All/HOD/Admin | Fetch OD requests |
| POST | `/extra-hours` | All | Log extra work |
| GET | `/extra-hours` | All/HOD/Admin | Fetch extra hours |
| GET | `/edit-requests` | All/HOD/Admin | Fetch diary edit requests |

### Approvals — `/api/admin/approvals`
| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| GET | `/pending` | Admin/HOD | All pending (leaves, ODs, extras, diary, edit requests) |
| PUT | `/leave/:id` | Admin/HOD | Approve/reject leave |
| PUT | `/od/:id` | Admin/HOD | Approve/reject OD |
| PUT | `/extra/:id` | Admin/HOD | Approve/reject extra hours |
| PUT | `/diary/:id` | Admin/HOD | Approve/reject submitted diary entry |
| PUT | `/change-request/:id` | Admin/HOD | Approve/reject diary edit request |

### Reports — `/api/reports`
| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| GET | `/diary` | All (role-filtered) | Diary logs; `?format=excel` → blob download |
| GET | `/attendance` | All (role-filtered) | Attendance summary + daily detail |
| GET | `/leave` | All (role-filtered) | Leave report with status filter |
| GET | `/conflicts` | Admin/HOD | Timetable room conflicts |

### Admin — `/api/admin`
| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| GET | `/config` | All | Fetch all system_configs |
| PUT | `/config` | Admin | Update config values |
| GET | `/holidays` | All | List holidays |
| POST | `/holidays` | Admin | Add holiday |
| DELETE | `/holidays/:id` | Admin | Delete holiday |
| GET | `/departments` | All | List departments |
| POST | `/departments` | Admin | Create department |
| PUT | `/departments/:id` | Admin | Update department |
| DELETE | `/departments/:id` | Admin | Delete department |
| GET | `/subjects` | All | List subjects |
| POST | `/subjects` | Admin | Create subject |
| PUT | `/subjects/:id` | Admin | Update subject |
| DELETE | `/subjects/:id` | Admin | Delete subject |

### Notifications — `/api/notifications`
| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| GET | `/` | All | Own notifications (recent 100) |
| PUT | `/read-all` | All | Mark all as read |
| PUT | `/:id/read` | All | Mark individual notification as read |

---

## 🎭 User Roles & Access

| Feature | Faculty | HOD | Admin |
|---------|---------|-----|-------|
| Daily Diary (own) | ✅ | ✅ | ✅ |
| Diary History (own, date range) | ✅ | ✅ | ✅ |
| Timetable Management (own) | ✅ | ✅ | ✅ |
| Leave / OD / Extra Hours | ✅ | ✅ | ✅ |
| View Own Requests | ✅ | ✅ | ✅ |
| My Profile (edit designation, phone, pwd) | ✅ | ✅ | ✅ |
| Approve Leave/OD/Diary (dept) | ❌ | ✅ | ✅ |
| Attendance View/Mark (dept) | ❌ | ✅ | ✅ |
| View Dept Reports | ❌ | ✅ | ✅ |
| Timetable Conflicts | ❌ | ✅ | ✅ |
| User Management (full CRUD) | ❌ | ❌ | ✅ |
| Subject Management | ❌ | ❌ | ✅ |
| Department Management | ❌ | ❌ | ✅ |
| System Configuration | ❌ | ❌ | ✅ |
| Holidays Management | ❌ | ❌ | ✅ |

---

## ✅ All Features Implemented

### Backend
- [x] JWT authentication with 8h expiry + `?token=` query param support for downloads
- [x] Bcrypt password hashing + first-login flag
- [x] Full diary CRUD with draft → submit → approve workflow
- [x] Admin/HOD can approve/reject submitted diary entries (new)
- [x] Auto-populate diary from timetable on first access of a day
- [x] Server-side time collision check for diary entries AND timetable slots
- [x] Edit request workflow with admin-defined expiry window
- [x] Leave, OD, Extra Hours request & approval system
- [x] Approval notifications to Admin/HOD on request submission
- [x] Notification system (individual + bulk mark-as-read)
- [x] Attendance CRUD with upsert support + summary aggregation (new)
- [x] Diary, attendance, leave, and conflict reports with Excel blob export
- [x] System config (diary time window, max faculty, edit window hours)
- [x] Holiday management
- [x] Department CRUD (new: create, update, delete)
- [x] Subject CRUD (new: update, delete)
- [x] User DELETE endpoint (new)
- [x] Role-based middleware (Admin / HOD / Faculty)
- [x] Bulk user creation from Excel
- [x] Startup env var validation (exits with clear error if .env is incomplete)

### Frontend
- [x] Login page with first-login redirect to change-password
- [x] Auth context (JWT stored in localStorage, auto-logout on expiry)
- [x] Dark-mode design system via CSS custom properties
- [x] Responsive sidebar with role-aware navigation (updated with new pages)
- [x] Notification bell with 30s polling + per-item mark-read
- [x] Faculty dashboard: add/edit/delete/submit diary entries, date navigation
- [x] **Diary History page** — date range, collapsible day rows, stats (new)
- [x] Client-side overlap hint in diary entry modal
- [x] Edit request modal for past locked entries
- [x] Timetable weekly grid with slot CRUD
- [x] Leave, OD, Extra Hours submission forms
- [x] My Requests page (combined history of all request types)
- [x] **Profile page** — view info, edit designation/phone, change password (new)
- [x] Admin: User management — **Edit User modal + Delete User button** (new)
- [x] Admin: Bulk upload with **password Excel download button** (new)
- [x] Admin: Approvals queue — **Diary tab added** (Leave/OD/Extra/Diary/Edit)
- [x] Admin: **Attendance page** — view by date/dept + Mark Attendance modal (new)
- [x] Admin: Conflicts page (room-based, Theory and Lab)
- [x] Admin: Reports page — **fixed Excel download** (fetch blob, no URL token leak) (new)
- [x] Admin: System Config page (5 settings)
- [x] Admin: **Subjects page** — list, add, edit, delete subjects (new)
- [x] Admin: **Departments page** — list, add, edit, delete departments (new)
- [x] Admin: Holidays page (add/delete)
- [x] Protected routes with role guards
- [x] `jspdf` unused dependency removed

---

## ⚙️ System Configuration Defaults

| Config Key | Default | Description |
|------------|---------|-------------|
| `diary_start_time` | `08:30` | Earliest diary entry time |
| `diary_end_time` | `16:10` | Latest diary entry time |
| `theory_max_faculty` | `1` | Max faculty per theory room/slot |
| `lab_max_faculty` | `2` | Max faculty per lab room/slot |
| `past_edit_window_hours` | `24` | Hours to edit past entries after approval |

---

## 🔧 Known Remaining / Future Improvements

These are lower-priority polish items that can be done in a future sprint:

| # | Item | Priority |
|---|------|----------|
| 1 | **Automated Tests** — No unit or integration tests exist | 🟡 Medium |
| 2 | **CORS Hardening** — `origin: '*'` should be tightened to specific LAN IP in production | 🟡 Medium |
| 3 | **Mobile Responsive Layout** — Fixed sidebar may not work well on phones/tablets | 🟡 Medium |
| 4 | **Pagination** — Approvals and reports load all records; will be slow with large datasets | 🟡 Medium |
| 5 | **HOD Dept Diary Overview** — No dedicated page to see all faculty diary entries for a date | 🟢 Low |
| 6 | **Diary Entry Min/Max Validation** — No char limit enforcement on description field | 🟢 Low |
| 7 | **Attendance Auto-population** — Could auto-mark attendance based on diary submission status | 🟢 Low |

---

## 🚀 Quick Start

```bash
# 1. Setup DB
mysql -u root -p < database/schema.sql
mysql -u root -p < database/seed.sql

# 2. Configure backend
#    Edit backend/.env:
#    DB_HOST=localhost
#    DB_USER=root
#    DB_PASSWORD=yourpassword
#    DB_NAME=college_diary
#    JWT_SECRET=your_long_random_secret
#    PORT=5000

# 3. Configure frontend
#    Edit frontend/.env → VITE_API_URL=http://<YOUR_LAN_IP>:5000

# 4. Install and run
npm install
cd frontend && npm install && cd ..
scripts\start-all.bat      # Windows
# ./scripts/start-all.sh  # Linux/Mac

# 5. Login at http://localhost:3000
#    Email: admin@college.edu | Password: Admin@1234
```

---

## 🔑 Default Credentials

| Email | Password | Role |
|-------|----------|------|
| `admin@college.edu` | `Admin@1234` | Admin |

> ⚠️ Change the admin password immediately after first login.
