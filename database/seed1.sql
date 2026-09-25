INSERT IGNORE INTO users
  (employee_id, full_name, short_name, education_type, department, designation, email, password_hash, role, is_first_login)
VALUES
  (
    'ADMIN002',
    'System Administrator',
    'Admin',
    'B.Tech',
    'Computer Science & Engineering',
    'System Administrator',
    'admin@college.edu',
    '$2b$10$P0RgcYpNEKkwf2TWkbdIsu1stt4BqsZ3U1XvCw2yidMFkZtK1fz2S',
    'Admin',
    FALSE
  );