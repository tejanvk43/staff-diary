-- ============================================================
-- Counselling history retention
--
-- Reports are keyed by the student's stable roll number, not by the
-- current students row. Deleting a student must not cascade-delete
-- historical counselling records; adding the same roll number again
-- continues the same report history.
-- ============================================================

-- Preserve the student and counselor details that were true when a
-- counselling report was written, even if either current row is later gone.
ALTER TABLE counseling_records
  ADD COLUMN student_name_snapshot VARCHAR(150) DEFAULT NULL AFTER student_roll_number,
  ADD COLUMN student_department_snapshot VARCHAR(150) DEFAULT NULL AFTER student_name_snapshot,
  ADD COLUMN student_year_snapshot TINYINT UNSIGNED DEFAULT NULL AFTER student_department_snapshot,
  ADD COLUMN student_section_snapshot VARCHAR(10) DEFAULT NULL AFTER student_year_snapshot,
  ADD COLUMN counselor_name_snapshot VARCHAR(150) DEFAULT NULL AFTER counselor_id;

-- Backfill snapshots for records already in the database while the current
-- student and counselor rows are still available.
UPDATE counseling_records cr
JOIN students s ON s.roll_number = cr.student_roll_number
SET cr.student_name_snapshot = s.name,
    cr.student_department_snapshot = s.department,
    cr.student_year_snapshot = s.year,
    cr.student_section_snapshot = s.section
WHERE cr.student_name_snapshot IS NULL;

UPDATE counseling_records cr
JOIN users u ON u.employee_id = cr.counselor_id
SET cr.counselor_name_snapshot = u.full_name
WHERE cr.counselor_name_snapshot IS NULL;

-- Existing counselling records must survive deletion of their student.
ALTER TABLE counseling_records
  DROP FOREIGN KEY fk_cr_student;

-- A deleted counselor should also not make the report disappear. Keep the
-- employee ID and snapshot name, while allowing the live user row to be gone.
ALTER TABLE counseling_records
  MODIFY COLUMN counselor_id VARCHAR(20) DEFAULT NULL,
  DROP FOREIGN KEY fk_cr_counselor;

ALTER TABLE counseling_records
  ADD CONSTRAINT fk_cr_counselor
    FOREIGN KEY (counselor_id) REFERENCES users(employee_id) ON DELETE SET NULL;

CREATE INDEX idx_counseling_records_roll_date
  ON counseling_records(student_roll_number, counseling_date, created_at);
