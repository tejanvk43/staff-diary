-- ============================================================
-- Migration: Add short_name to subject_types
-- Run this against the college_diary database
-- ============================================================

USE college_diary;

-- 1. Add short_name column (nullable VARCHAR so existing rows are safe)
ALTER TABLE subject_types
  ADD COLUMN short_name VARCHAR(10) NULL
  AFTER name;

-- 2. Seed sensible defaults for pre-existing rows
UPDATE subject_types SET short_name = 'TH'  WHERE name = 'Theory'  AND short_name IS NULL;
UPDATE subject_types SET short_name = 'LAB' WHERE name = 'Lab'     AND short_name IS NULL;
