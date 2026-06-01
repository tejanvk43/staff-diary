-- ============================================================
-- Migration: Block (Class) Timetables
-- Run this against the college_diary database
-- ============================================================

USE college_diary;

-- Master timetable definition (one per class block)
CREATE TABLE IF NOT EXISTS block_timetables (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  name           VARCHAR(100)  NOT NULL,                          -- e.g. "CSE-A 2nd Year"
  department     VARCHAR(100)  NOT NULL,
  education_type ENUM('B-Tech','Diploma') DEFAULT 'B-Tech',
  year           TINYINT       NOT NULL DEFAULT 1,
  section        VARCHAR(10)   DEFAULT NULL,                      -- A, B, C …
  academic_year  VARCHAR(20)   DEFAULT NULL,                      -- 2024-25
  created_by     VARCHAR(20)   DEFAULT NULL,
  created_at     TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Slots for each block timetable
CREATE TABLE IF NOT EXISTS block_timetable_slots (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  timetable_id   INT NOT NULL,
  day            ENUM('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday') NOT NULL,
  from_time      TIME NOT NULL,
  to_time        TIME NOT NULL,
  subject_id     INT          DEFAULT NULL,
  subject_name   VARCHAR(200) DEFAULT NULL,
  short_name     VARCHAR(50)  DEFAULT NULL,
  subject_type   ENUM('Theory','Lab','Break','Free') DEFAULT 'Theory',
  room_number    VARCHAR(50)  DEFAULT NULL,
  faculty_id     VARCHAR(20)  DEFAULT NULL,
  faculty_name   VARCHAR(100) DEFAULT NULL,
  notes          TEXT         DEFAULT NULL,
  FOREIGN KEY (timetable_id) REFERENCES block_timetables(id) ON DELETE CASCADE
);
