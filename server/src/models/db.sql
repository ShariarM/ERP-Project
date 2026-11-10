CREATE DATABASE IF NOT EXISTS erp_db
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE erp_db;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin','sales','marketing','accounting') NOT NULL DEFAULT 'sales',
  last_seen_at DATETIME NULL,                      -- last heartbeat from the browser
  is_logged_in TINYINT(1) NOT NULL DEFAULT 0,      -- 1 between login and logout
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100),
  phone VARCHAR(20),
  address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sales (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NULL,
  amount DECIMAL(10,2) NOT NULL,
  description VARCHAR(255),
  sale_date DATE NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sales_customer
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
);

-- ---------- Attendance + Leave ----------
CREATE TABLE IF NOT EXISTS attendance (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  user_id   INT NOT NULL,
  date      DATE NOT NULL,
  clock_in  TIME NOT NULL,
  clock_out TIME NULL,
  UNIQUE KEY uq_attendance_user_day (user_id, date),   -- one record per person per day
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS leave_requests (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NOT NULL,
  type       VARCHAR(30)  NOT NULL,
  start_date DATE         NOT NULL,
  end_date   DATE         NOT NULL,
  reason     VARCHAR(255) NOT NULL,
  status     ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Upgrade for databases imported BEFORE the marketing role existed. Safe to run again.
ALTER TABLE users
  MODIFY role ENUM('admin','sales','marketing','accounting') NOT NULL DEFAULT 'sales';

-- Online/offline tracking for the admin dashboard.
-- Adds the two columns to databases created BEFORE this feature. Safe to run again.
SET @c1 := (SELECT COUNT(*) FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'last_seen_at');
SET @q1 := IF(@c1 = 0, 'ALTER TABLE users ADD COLUMN last_seen_at DATETIME NULL', 'SELECT 1');
PREPARE s1 FROM @q1; EXECUTE s1; DEALLOCATE PREPARE s1;

SET @c2 := (SELECT COUNT(*) FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'is_logged_in');
SET @q2 := IF(@c2 = 0, 'ALTER TABLE users ADD COLUMN is_logged_in TINYINT(1) NOT NULL DEFAULT 0', 'SELECT 1');
PREPARE s2 FROM @q2; EXECUTE s2; DEALLOCATE PREPARE s2;
