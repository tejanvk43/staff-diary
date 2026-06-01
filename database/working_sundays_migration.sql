-- ============================================================
-- Migration: Add working_sundays table
-- Run this against the college_diary database
-- ============================================================

USE college_diary;

CREATE TABLE IF NOT EXISTS working_sundays (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  working_date DATE NOT NULL UNIQUE,
  notes        VARCHAR(255) DEFAULT NULL,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
