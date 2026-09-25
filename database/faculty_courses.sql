-- 1. faculty_block_assignments
CREATE TABLE faculty_block_assignments (
  id INT NOT NULL AUTO_INCREMENT,
  employee_id VARCHAR(20) NOT NULL,
  block_id INT NOT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_emp_block (employee_id, block_id),
  KEY block_id (block_id),
  CONSTRAINT faculty_block_assignments_ibfk_1
    FOREIGN KEY (employee_id)
    REFERENCES users (employee_id)
    ON DELETE CASCADE,
  CONSTRAINT faculty_block_assignments_ibfk_2
    FOREIGN KEY (block_id)
    REFERENCES block_timetables (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- 2. faculty_courses
CREATE TABLE faculty_courses (
  id INT NOT NULL AUTO_INCREMENT,
  employee_id VARCHAR(20) NOT NULL,
  education_type ENUM('Diploma','B-Tech','M-Tech') NOT NULL,
  year INT NOT NULL,
  section VARCHAR(10) NOT NULL,
  section_id INT DEFAULT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY employee_id (employee_id),
  CONSTRAINT faculty_courses_ibfk_1
    FOREIGN KEY (employee_id)
    REFERENCES users (employee_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. faculty_other_works
CREATE TABLE faculty_other_works (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  employee_id VARCHAR(20) NOT NULL,
  day ENUM('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday') NOT NULL,
  from_time TIME NOT NULL,
  to_time TIME NOT NULL,
  duty_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY fk_fow_employee (employee_id),
  CONSTRAINT fk_fow_employee
    FOREIGN KEY (employee_id)
    REFERENCES users (employee_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- 4. faculty_subjects
CREATE TABLE faculty_subjects (
  id INT NOT NULL AUTO_INCREMENT,
  employee_id VARCHAR(20) NOT NULL,
  subject_id INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_emp_subj (employee_id, subject_id),
  KEY subject_id (subject_id),
  CONSTRAINT faculty_subjects_ibfk_1
    FOREIGN KEY (employee_id)
    REFERENCES users (employee_id)
    ON DELETE CASCADE,
  CONSTRAINT faculty_subjects_ibfk_2
    FOREIGN KEY (subject_id)
    REFERENCES subjects (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;