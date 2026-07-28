-- Add bank_holder_name to users
ALTER TABLE users ADD COLUMN bank_holder_name VARCHAR(150) DEFAULT NULL AFTER bank_ifsc;

-- Add bank_holder_name fields to bank_detail_change_requests
ALTER TABLE bank_detail_change_requests
  ADD COLUMN old_bank_holder_name VARCHAR(150) DEFAULT NULL AFTER old_bank_ifsc,
  ADD COLUMN new_bank_holder_name VARCHAR(150) DEFAULT NULL AFTER old_bank_holder_name;

-- Create students table
CREATE TABLE IF NOT EXISTS students (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  roll_number VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  department VARCHAR(150) NOT NULL,
  year TINYINT UNSIGNED NOT NULL,
  section VARCHAR(10) DEFAULT NULL,
  counselor_id VARCHAR(20) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_students_counselor FOREIGN KEY (counselor_id) REFERENCES users(employee_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create counseling_records table
CREATE TABLE IF NOT EXISTS counseling_records (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  student_roll_number VARCHAR(50) NOT NULL,
  counselor_id VARCHAR(20) NOT NULL,
  counseling_date DATE NOT NULL,
  discussion_points TEXT NOT NULL,
  action_taken TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cr_student FOREIGN KEY (student_roll_number) REFERENCES students(roll_number) ON DELETE CASCADE,
  CONSTRAINT fk_cr_counselor FOREIGN KEY (counselor_id) REFERENCES users(employee_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
