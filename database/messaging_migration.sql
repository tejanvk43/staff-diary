-- Auditable staff messaging
-- Messages are append-only: the API exposes no update/delete operation and the
-- database triggers reject any attempt to mutate or remove a sent message.

CREATE TABLE IF NOT EXISTS message_conversations (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  subject       VARCHAR(255) NOT NULL,
  audience_type ENUM('ALL_STAFF','HODS_ONLY','INDIVIDUAL','DEPARTMENT_GROUP') NOT NULL,
  department    VARCHAR(150) DEFAULT NULL,
  created_by    VARCHAR(20) NOT NULL,
  created_at    DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_message_conversation_creator
    FOREIGN KEY (created_by) REFERENCES users(employee_id) ON DELETE RESTRICT,
  INDEX idx_message_conversations_created (created_at),
  INDEX idx_message_conversations_audience (audience_type, department)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS message_participants (
  conversation_id BIGINT UNSIGNED NOT NULL,
  employee_id     VARCHAR(20) NOT NULL,
  participant_role ENUM('sender','recipient') NOT NULL DEFAULT 'recipient',
  is_required     BOOLEAN NOT NULL DEFAULT FALSE,
  added_at        DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (conversation_id, employee_id),
  CONSTRAINT fk_message_participant_conversation
    FOREIGN KEY (conversation_id) REFERENCES message_conversations(id) ON DELETE CASCADE,
  CONSTRAINT fk_message_participant_employee
    FOREIGN KEY (employee_id) REFERENCES users(employee_id) ON DELETE RESTRICT,
  INDEX idx_message_participants_employee (employee_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS message_records (
  id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  conversation_id     BIGINT UNSIGNED NOT NULL,
  sender_employee_id  VARCHAR(20) NOT NULL,
  body                TEXT NOT NULL,
  sent_at             DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  immutable_hash      CHAR(64) NOT NULL,
  CONSTRAINT fk_message_record_conversation
    FOREIGN KEY (conversation_id) REFERENCES message_conversations(id) ON DELETE RESTRICT,
  CONSTRAINT fk_message_record_sender
    FOREIGN KEY (sender_employee_id) REFERENCES users(employee_id) ON DELETE RESTRICT,
  INDEX idx_message_records_conversation_sent (conversation_id, sent_at, id),
  INDEX idx_message_records_sender (sender_employee_id, sent_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TRIGGER IF EXISTS prevent_message_record_update;
CREATE TRIGGER prevent_message_record_update
BEFORE UPDATE ON message_records
FOR EACH ROW
SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Sent messages are immutable and cannot be updated';

DROP TRIGGER IF EXISTS prevent_message_record_delete;
CREATE TRIGGER prevent_message_record_delete
BEFORE DELETE ON message_records
FOR EACH ROW
SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Sent messages are immutable and cannot be deleted';
