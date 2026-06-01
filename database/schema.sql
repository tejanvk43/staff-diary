-- ============================================================
-- College Staff Daily Activity Recording System
-- Database Schema — MySQL 8, InnoDB, utf8mb4
-- ============================================================

CREATE DATABASE IF NOT EXISTS college_diary
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE college_diary;

-- ============================================================
-- 1. departments
-- ============================================================
CREATE TABLE IF NOT EXISTS departments (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  department_name VARCHAR(150) NOT NULL,
  department_code VARCHAR(20)  NOT NULL UNIQUE,
  hod_employee_id VARCHAR(20)  DEFAULT NULL,
  programme       VARCHAR(50)  DEFAULT NULL,
  created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 2. users
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  employee_id     VARCHAR(20)  NOT NULL UNIQUE,
  full_name       VARCHAR(150) NOT NULL,
  short_name      VARCHAR(50)  DEFAULT NULL,
  education_type  ENUM('B-Tech','Diploma') NOT NULL,
  department      VARCHAR(150) NOT NULL,
  designation     VARCHAR(100) DEFAULT NULL,
  phone_number    VARCHAR(20)  DEFAULT NULL,
  email           VARCHAR(191) NOT NULL UNIQUE,
  password_hash   VARCHAR(255) NOT NULL,
  role            ENUM('Admin','HOD','Faculty') NOT NULL DEFAULT 'Faculty',
  is_first_login  BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 3. subjects
-- ============================================================
CREATE TABLE IF NOT EXISTS subjects (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  subject_code  VARCHAR(30)  NOT NULL UNIQUE,
  subject_name  VARCHAR(200) NOT NULL,
  subject_type  ENUM('Theory','Lab') NOT NULL,
  education_type ENUM('B-Tech','Diploma') NOT NULL,
  year          TINYINT UNSIGNED NOT NULL COMMENT '1-4 for B-Tech, 1-3 for Diploma',
  semester      TINYINT UNSIGNED NOT NULL,
  department    VARCHAR(150) NOT NULL,
  created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 4. timetables
-- ============================================================
CREATE TABLE IF NOT EXISTS timetables (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  employee_id   VARCHAR(20)  NOT NULL,
  subject_id    INT UNSIGNED DEFAULT NULL,
  short_name    VARCHAR(50)  DEFAULT NULL,
  day           ENUM('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday') NOT NULL,
  from_time     TIME         NOT NULL,
  to_time       TIME         NOT NULL,
  subject_type  ENUM('Theory','Lab') NOT NULL,
  education_type ENUM('B-Tech','Diploma') NOT NULL,
  year          TINYINT UNSIGNED DEFAULT NULL,
  section       VARCHAR(10)  DEFAULT NULL,
  room_number   VARCHAR(30)  DEFAULT NULL,
  created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_tt_employee FOREIGN KEY (employee_id) REFERENCES users(employee_id) ON DELETE CASCADE,
  CONSTRAINT fk_tt_subject  FOREIGN KEY (subject_id)  REFERENCES subjects(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 5. holidays
-- ============================================================
CREATE TABLE IF NOT EXISTS holidays (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  holiday_date  DATE         NOT NULL UNIQUE,
  holiday_name  VARCHAR(150) NOT NULL,
  description   TEXT         DEFAULT NULL,
  created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 6. extra_hours
-- ============================================================
CREATE TABLE IF NOT EXISTS extra_hours (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  employee_id   VARCHAR(20)  NOT NULL,
  purpose       VARCHAR(200) NOT NULL,
  description   TEXT         DEFAULT NULL,
  from_time     DATETIME     NOT NULL,
  to_time       DATETIME     NOT NULL,
  status        ENUM('Pending','Approved','Rejected') NOT NULL DEFAULT 'Pending',
  approved_by   VARCHAR(20)  DEFAULT NULL,
  created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_eh_employee FOREIGN KEY (employee_id) REFERENCES users(employee_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 7. on_duty_requests
-- ============================================================
CREATE TABLE IF NOT EXISTS on_duty_requests (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  employee_id   VARCHAR(20)  NOT NULL,
  od_date       DATE         NOT NULL,
  place         VARCHAR(200) NOT NULL,
  session_type  ENUM('FN','AN','Full Day') NOT NULL,
  purpose       TEXT         NOT NULL,
  status        ENUM('Pending','Approved','Rejected') NOT NULL DEFAULT 'Pending',
  approved_by   VARCHAR(20)  DEFAULT NULL,
  reviewed_at   DATETIME     DEFAULT NULL,
  created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_od_employee FOREIGN KEY (employee_id) REFERENCES users(employee_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 8. leave_requests
-- ============================================================
CREATE TABLE IF NOT EXISTS leave_requests (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  employee_id   VARCHAR(20)  NOT NULL,
  leave_date    DATE         NOT NULL,
  reason        TEXT         NOT NULL,
  session_type  ENUM('FN','AN','Full Day') NOT NULL,
  leave_type    ENUM('Sick','Casual','Permission','Emergency','Other') NOT NULL,
  status        ENUM('Pending','Approved','Rejected') NOT NULL DEFAULT 'Pending',
  approved_by   VARCHAR(20)  DEFAULT NULL,
  reviewed_at   DATETIME     DEFAULT NULL,
  created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_lr_employee FOREIGN KEY (employee_id) REFERENCES users(employee_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 9. request_detail_changes
-- ============================================================
CREATE TABLE IF NOT EXISTS request_detail_changes (
  id                    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  employee_id           VARCHAR(20)  NOT NULL,
  target_table          VARCHAR(100) NOT NULL,
  target_record_id      BIGINT UNSIGNED NOT NULL,
  request_type          VARCHAR(50)  NOT NULL DEFAULT 'edit',
  change_payload        JSON         DEFAULT NULL,
  reason                TEXT         NOT NULL,
  status                ENUM('Pending','Approved','Rejected') NOT NULL DEFAULT 'Pending',
  reviewed_by           VARCHAR(20)  DEFAULT NULL,
  reviewed_at           DATETIME     DEFAULT NULL,
  edit_window_expires_at DATETIME    DEFAULT NULL,
  remarks               TEXT         DEFAULT NULL,
  created_at            TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_rdc_employee FOREIGN KEY (employee_id) REFERENCES users(employee_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 10. diary_logs
-- ============================================================
CREATE TABLE IF NOT EXISTS diary_logs (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  employee_id   VARCHAR(20)  NOT NULL,
  log_date      DATE         NOT NULL,
  from_time     DATETIME     NOT NULL,
  to_time       DATETIME     NOT NULL,
  description   TEXT         DEFAULT NULL,
  activity_type ENUM('Teaching','Meeting','Research','Administration','Exam Duty','Lab Work','Other') NOT NULL DEFAULT 'Teaching',
  status        ENUM('Draft','Submitted','Approved','Rejected') NOT NULL DEFAULT 'Draft',
  reviewed_by   VARCHAR(20)  DEFAULT NULL,
  reviewed_at   DATETIME     DEFAULT NULL,
  remarks       TEXT         DEFAULT NULL,
  created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_dl_employee FOREIGN KEY (employee_id) REFERENCES users(employee_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 11. attendance
-- ============================================================
CREATE TABLE IF NOT EXISTS attendance (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  employee_id      VARCHAR(20)  NOT NULL,
  attendance_date  DATE         NOT NULL,
  check_in         DATETIME     DEFAULT NULL,
  check_out        DATETIME     DEFAULT NULL,
  status           ENUM('Present','Absent','Leave','OD','Holiday') NOT NULL DEFAULT 'Present',
  remarks          TEXT         DEFAULT NULL,
  created_at       TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_attendance (employee_id, attendance_date),
  CONSTRAINT fk_att_employee FOREIGN KEY (employee_id) REFERENCES users(employee_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 12. notifications
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sender_employee_id  VARCHAR(20)  DEFAULT NULL,
  receiver_employee_id VARCHAR(20) NOT NULL,
  title               VARCHAR(255) NOT NULL,
  message             TEXT         NOT NULL,
  is_read             BOOLEAN      NOT NULL DEFAULT FALSE,
  notification_type   ENUM('Leave','OD','Timetable','General','Approval') NOT NULL DEFAULT 'General',
  created_at          TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notif_receiver FOREIGN KEY (receiver_employee_id) REFERENCES users(employee_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 13. system_configs
-- ============================================================
CREATE TABLE IF NOT EXISTS system_configs (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  config_key    VARCHAR(100) NOT NULL UNIQUE,
  config_value  VARCHAR(255) NOT NULL,
  description   TEXT         DEFAULT NULL,
  updated_by    VARCHAR(20)  DEFAULT NULL,
  updated_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Indexes for performance
-- ============================================================
CREATE INDEX idx_diary_employee_date ON diary_logs(employee_id, log_date);
CREATE INDEX idx_timetable_employee  ON timetables(employee_id, day);
CREATE INDEX idx_leave_employee      ON leave_requests(employee_id, status);
CREATE INDEX idx_od_employee         ON on_duty_requests(employee_id, status);
CREATE INDEX idx_notif_receiver      ON notifications(receiver_employee_id, is_read);
CREATE INDEX idx_extra_employee      ON extra_hours(employee_id, status);
