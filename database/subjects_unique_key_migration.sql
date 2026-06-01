-- ============================================================
-- Migration: change unique key on subjects to (branch_sname, subject_code)
-- ============================================================
USE college_diary;

-- 1. Add branch_sname column (short dept code from Excel "Branch Sname")
ALTER TABLE subjects
  ADD COLUMN branch_sname VARCHAR(20) NULL AFTER department;

-- 2. Drop the old single-column unique key on subject_code
ALTER TABLE subjects DROP INDEX subject_code;

-- 3. Add composite unique key: same subject code can exist in different branches
ALTER TABLE subjects
  ADD UNIQUE KEY uniq_branch_sub (branch_sname, subject_code);
