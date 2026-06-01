-- ============================================================
-- Migration: Dynamic Programs, Years, and Branches
-- Run this against the college_diary database
-- ============================================================

USE college_diary;

-- 1. Alter existing ENUM columns to VARCHAR(50)
ALTER TABLE users MODIFY COLUMN education_type VARCHAR(50) NOT NULL;
ALTER TABLE subjects MODIFY COLUMN education_type VARCHAR(50) NOT NULL;
ALTER TABLE timetables MODIFY COLUMN education_type VARCHAR(50) NOT NULL;
ALTER TABLE block_timetables MODIFY COLUMN education_type VARCHAR(50) DEFAULT 'B-Tech';
ALTER TABLE class_sections MODIFY COLUMN education_type VARCHAR(50) NOT NULL;

-- 2. Create programs table
CREATE TABLE IF NOT EXISTS programs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Create program_years table
CREATE TABLE IF NOT EXISTS program_years (
  id INT AUTO_INCREMENT PRIMARY KEY,
  program_id INT NOT NULL,
  year_number INT NOT NULL,
  year_name VARCHAR(50) NOT NULL,
  UNIQUE KEY uq_prog_year (program_id, year_number),
  CONSTRAINT fk_py_program FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Create program_branches table
CREATE TABLE IF NOT EXISTS program_branches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  program_id INT NOT NULL,
  branch_name VARCHAR(100) NOT NULL,
  UNIQUE KEY uq_prog_branch (program_id, branch_name),
  CONSTRAINT fk_pb_program FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Seed default programs data
INSERT INTO programs (name) VALUES ('B-Tech') ON DUPLICATE KEY UPDATE name=name;
SET @btech_id = (SELECT id FROM programs WHERE name = 'B-Tech');
INSERT IGNORE INTO program_years (program_id, year_number, year_name) VALUES
  (@btech_id, 1, 'Year 1'),
  (@btech_id, 2, 'Year 2'),
  (@btech_id, 3, 'Year 3'),
  (@btech_id, 4, 'Year 4');
INSERT IGNORE INTO program_branches (program_id, branch_name) VALUES
  (@btech_id, 'CSE'),
  (@btech_id, 'ECE'),
  (@btech_id, 'EEE'),
  (@btech_id, 'ME'),
  (@btech_id, 'CE'),
  (@btech_id, 'General');

INSERT INTO programs (name) VALUES ('Diploma') ON DUPLICATE KEY UPDATE name=name;
SET @diploma_id = (SELECT id FROM programs WHERE name = 'Diploma');
INSERT IGNORE INTO program_years (program_id, year_number, year_name) VALUES
  (@diploma_id, 1, 'Year 1'),
  (@diploma_id, 2, 'Year 2'),
  (@diploma_id, 3, 'Year 3');
INSERT IGNORE INTO program_branches (program_id, branch_name) VALUES
  (@diploma_id, 'CSE'),
  (@diploma_id, 'ECE'),
  (@diploma_id, 'EEE'),
  (@diploma_id, 'ME');

INSERT INTO programs (name) VALUES ('M-Tech') ON DUPLICATE KEY UPDATE name=name;
SET @mtech_id = (SELECT id FROM programs WHERE name = 'M-Tech');
INSERT IGNORE INTO program_years (program_id, year_number, year_name) VALUES
  (@mtech_id, 1, 'Year 1'),
  (@mtech_id, 2, 'Year 2');
INSERT IGNORE INTO program_branches (program_id, branch_name) VALUES
  (@mtech_id, 'CSE'),
  (@mtech_id, 'ECE'),
  (@mtech_id, 'EEE');
