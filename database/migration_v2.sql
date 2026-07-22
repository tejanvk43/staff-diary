-- ============================================================
-- Migration: V2 Changes (Highest Qualification & Bank Details)
-- Run this against the college_diary database
-- ============================================================

USE college_diary;

-- 1. Rename education_type to highest_qualification in users table
ALTER TABLE users CHANGE COLUMN education_type highest_qualification VARCHAR(100) NOT NULL DEFAULT 'B.Tech';

-- 2. Add bank details columns to users table
ALTER TABLE users
  ADD COLUMN bank_name VARCHAR(150) DEFAULT NULL AFTER phone_number,
  ADD COLUMN bank_account_no VARCHAR(50) DEFAULT NULL AFTER bank_name,
  ADD COLUMN bank_ifsc VARCHAR(50) DEFAULT NULL AFTER bank_account_no,
  ADD COLUMN bank_details_submitted BOOLEAN NOT NULL DEFAULT FALSE AFTER bank_ifsc;

-- 3. Create bank_detail_change_requests table to track change history and requests
CREATE TABLE IF NOT EXISTS bank_detail_change_requests (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  employee_id VARCHAR(20) NOT NULL,
  old_bank_name VARCHAR(150) DEFAULT NULL,
  new_bank_name VARCHAR(150) DEFAULT NULL,
  old_bank_account_no VARCHAR(50) DEFAULT NULL,
  new_bank_account_no VARCHAR(50) DEFAULT NULL,
  old_bank_ifsc VARCHAR(50) DEFAULT NULL,
  new_bank_ifsc VARCHAR(50) DEFAULT NULL,
  reason TEXT NOT NULL,
  status ENUM('Pending','Approved','Rejected') NOT NULL DEFAULT 'Pending',
  reviewed_by VARCHAR(20) DEFAULT NULL,
  reviewed_at DATETIME DEFAULT NULL,
  remarks TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_bdcr_employee FOREIGN KEY (employee_id) REFERENCES users(employee_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
