CREATE TABLE IF NOT EXISTS class_adjustments (
  id                     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  employee_id            VARCHAR(20)  NOT NULL,
  adjustment_date        DATE         NOT NULL,
  day                    VARCHAR(20)  NOT NULL,
  from_time              TIME         NOT NULL,
  to_time                TIME         NOT NULL,
  subject_name           VARCHAR(200) NOT NULL,
  section                VARCHAR(50)  DEFAULT NULL,
  assigned_to_employee_id VARCHAR(20) NOT NULL,
  status                 ENUM('Pending', 'Approved', 'Rejected') NOT NULL DEFAULT 'Pending',
  approved_by            VARCHAR(20)  DEFAULT NULL,
  reviewed_at            DATETIME     DEFAULT NULL,
  remarks                TEXT         DEFAULT NULL,
  created_at             TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ca_employee FOREIGN KEY (employee_id) REFERENCES users(employee_id) ON DELETE CASCADE,
  CONSTRAINT fk_ca_assigned FOREIGN KEY (assigned_to_employee_id) REFERENCES users(employee_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
