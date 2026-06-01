require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const { PORT } = require('./src/config/config');

// ─── Startup Environment Validation ───────────────────────────────────────────
const REQUIRED_ENV = ['DB_HOST', 'DB_USER', 'DB_NAME', 'JWT_SECRET'];
const missingEnv = REQUIRED_ENV.filter(k => !process.env[k]);
if (missingEnv.length > 0) {
  console.error(`\n❌  Missing required environment variables: ${missingEnv.join(', ')}`);
  console.error('    Please check your backend/.env file.\n');
  process.exit(1);
}

// ─── Route Imports ────────────────────────────────────────────────────────────
const authRoutes          = require('./src/routes/auth');
const userRoutes          = require('./src/routes/users');
const diaryRoutes         = require('./src/routes/diary');
const timetableRoutes     = require('./src/routes/timetable');
const requestRoutes       = require('./src/routes/requests');
const approvalsRoutes     = require('./src/routes/approvals');
const reportsRoutes       = require('./src/routes/reports');
const notificationsRoutes = require('./src/routes/notifications');
const adminRoutes         = require('./src/routes/admin');
const attendanceRoutes        = require('./src/routes/attendance');
const blockTimetableRoutes    = require('./src/routes/blockTimetable');
const facultySetupRoutes      = require('./src/routes/facultySetup');

const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({
  origin: '*',          // LAN: all origins — tighten to specific IP in production
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'College Staff Diary API is running.', timestamp: new Date().toISOString() });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',                    authRoutes);
// ⚠️  Specific /api/admin/* routes MUST come before the generic /api/admin handler
app.use('/api/admin/users',             userRoutes);
app.use('/api/admin/approvals',         approvalsRoutes);
app.use('/api/admin/block-timetables',  blockTimetableRoutes);
app.use('/api/faculty',                 facultySetupRoutes);
app.use('/api/diary',                   diaryRoutes);
app.use('/api/timetable',               timetableRoutes);
app.use('/api/requests',                requestRoutes);
app.use('/api/reports',                 reportsRoutes);
app.use('/api/notifications',           notificationsRoutes);
app.use('/api/attendance',              attendanceRoutes);
// Generic /api/admin LAST — catches /api/admin/config, /api/admin/holidays, /api/admin/departments, /api/admin/subjects
app.use('/api/admin',                   adminRoutes);


// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found.` });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Internal server error.' });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀  College Staff Diary API`);
  console.log(`   Listening on http://0.0.0.0:${PORT}`);
  console.log(`   LAN access: http://<YOUR_LAN_IP>:${PORT}\n`);
});

module.exports = app;
