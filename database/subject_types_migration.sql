-- ============================================================
-- Migration: Dynamic Subject Types and Max Faculty Restraints
-- Run this against the college_diary database
-- ============================================================

USE college_diary;

-- 1. Create subject_types table
CREATE TABLE IF NOT EXISTS subject_types (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  max_faculty INT UNSIGNED NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Seed default dynamic types
INSERT IGNORE INTO subject_types (name, max_faculty) VALUES
  ('Theory', 1),
  ('Lab', 2);

-- 3. Modify columns to VARCHAR in existing tables to accept any dynamic type name
ALTER TABLE subjects MODIFY COLUMN subject_type VARCHAR(50) NOT NULL;
ALTER TABLE timetables MODIFY COLUMN subject_type VARCHAR(50) NOT NULL;
ALTER TABLE block_timetable_slots MODIFY COLUMN subject_type VARCHAR(50) NOT NULL DEFAULT 'Theory';
