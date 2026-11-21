CREATE DATABASE IF NOT EXISTS erp_db
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE erp_db;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NULL,                      -- unused: passwords now live in Firebase
  firebase_uid VARCHAR(128) NULL UNIQUE,           -- links this row to the Firebase account
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
  status ENUM('draft','confirmed','invoiced','paid') NOT NULL DEFAULT 'draft',
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

-- ---------- Workflow audit log (who moved a sale / leave request to which status) ----------
CREATE TABLE IF NOT EXISTS workflow_logs (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  entity_type VARCHAR(30) NOT NULL,
  entity_id   INT NOT NULL,
  from_status VARCHAR(30) NOT NULL,
  to_status   VARCHAR(30) NOT NULL,
  changed_by  INT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_workflow_entity (entity_type, entity_id),
  CONSTRAINT fk_workflow_user FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ---------- Inventory ----------
CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sku VARCHAR(60) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  category VARCHAR(100) NULL,
  unit VARCHAR(30) NOT NULL DEFAULT 'pcs',
  cost_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  selling_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  stock_quantity DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  reorder_level DECIMAL(12,2) NOT NULL DEFAULT 5.00,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_products_stock (is_active, stock_quantity, reorder_level)
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  movement_type ENUM('IN','OUT','ADJUSTMENT') NOT NULL,
  quantity DECIMAL(12,2) NOT NULL,
  stock_after DECIMAL(12,2) NOT NULL,
  note VARCHAR(255) NULL,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_stock_product_date (product_id, created_at),
  CONSTRAINT fk_stock_product FOREIGN KEY (product_id) REFERENCES products(id),
  CONSTRAINT fk_stock_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
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

-- Firebase login: link column + passwords are no longer stored in MySQL.
-- Upgrades databases created before Firebase was added. Safe to run again.
SET @c3 := (SELECT COUNT(*) FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'firebase_uid');
SET @q3 := IF(@c3 = 0, 'ALTER TABLE users ADD COLUMN firebase_uid VARCHAR(128) NULL UNIQUE', 'SELECT 1');
PREPARE s3 FROM @q3; EXECUTE s3; DEALLOCATE PREPARE s3;

ALTER TABLE users MODIFY password VARCHAR(255) NULL;

-- Sales workflow (draft > confirmed > invoiced > paid).
-- Sales that already exist keep counting as revenue: they become 'paid'; NEW sales start as 'draft'.
-- Safe to run again.
SET @s0 := (SELECT COUNT(*) FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sales' AND COLUMN_NAME = 'status');
SET @s1 := IF(@s0 = 0, 'ALTER TABLE sales ADD COLUMN status ENUM(''draft'',''confirmed'',''invoiced'',''paid'') NOT NULL DEFAULT ''paid''', 'SELECT 1');
PREPARE p1 FROM @s1; EXECUTE p1; DEALLOCATE PREPARE p1;
SET @s2 := IF(@s0 = 0, 'ALTER TABLE sales ALTER COLUMN status SET DEFAULT ''draft''', 'SELECT 1');
PREPARE p2 FROM @s2; EXECUTE p2; DEALLOCATE PREPARE p2;
