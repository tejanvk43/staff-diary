-- ============================================================
-- Migration: Add source column to block_timetables
-- Distinguishes manually-created timing blocks from
-- bulk-imported section timetables
-- Run this against the college_diary database
-- ============================================================

USE college_diary;

ALTER TABLE block_timetables
  ADD COLUMN source ENUM('manual', 'imported') NOT NULL DEFAULT 'manual'
  AFTER academic_year;

-- Mark all existing records created by bulk import as 'imported'
-- (blocks that have section set AND were not manually created are likely imports)
-- This is a best-effort classification; admin can verify from the UI.
UPDATE block_timetables
SET source = 'imported'
WHERE section IS NOT NULL
  AND created_by IS NOT NULL;
