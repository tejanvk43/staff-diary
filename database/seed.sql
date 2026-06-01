-- ============================================================
-- Seed Data — College Staff Daily Activity Recording System
-- ============================================================

USE college_diary;

-- ============================================================
-- system_configs defaults
-- ============================================================
INSERT IGNORE INTO system_configs (config_key, config_value, description) VALUES
  ('diary_start_time',     '08:30', 'Earliest allowed diary entry start time (HH:MM)'),
  ('diary_end_time',       '16:10', 'Latest allowed diary entry end time (HH:MM)'),
  ('theory_max_faculty',   '1',     'Maximum faculty allowed per theory slot/room'),
  ('lab_max_faculty',      '2',     'Maximum faculty allowed per lab slot/room'),
  ('past_edit_window_hours','24',   'Hours granted to edit a past diary entry after approval');

-- ============================================================
-- Default departments
-- ============================================================
INSERT IGNORE INTO departments (department_name, department_code) VALUES
  ('Computer Science & Engineering', 'CSE'),
  ('Electronics & Communication Engineering', 'ECE'),
  ('Mechanical Engineering', 'MECH'),
  ('Civil Engineering', 'CIVIL'),
  ('Information Technology', 'IT'),
  ('Electrical & Electronics Engineering', 'EEE');

-- ============================================================
-- Default Admin account
-- Password: Admin@1234  (bcrypt hash generated with 10 rounds)
-- ============================================================
INSERT IGNORE INTO users
  (employee_id, full_name, short_name, education_type, department, designation, email, password_hash, role, is_first_login)
VALUES
  (
    'ADMIN001',
    'System Administrator',
    'Admin',
    'B-Tech',
    'Computer Science & Engineering',
    'System Administrator',
    'admin@college.edu',
    '$2b$10$P0RgcYpNEKkwf2TWkbdIsu1stt4BqsZ3U1XvCw2yidMFkZtK1fz2S',
    'Admin',
    FALSE
  );
