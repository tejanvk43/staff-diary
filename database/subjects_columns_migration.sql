-- ============================================================
-- Migration: Add regulation and short_name columns to subjects
-- Run this against the college_diary database
-- ============================================================

USE college_diary;

ALTER TABLE subjects
  ADD COLUMN regulation VARCHAR(20) NULL AFTER subject_code,
  ADD COLUMN short_name VARCHAR(20) NULL AFTER subject_name;
