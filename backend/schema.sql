CREATE DATABASE IF NOT EXISTS keke_park_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE keke_park_system;

-- EXACT schema from your spec
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role ENUM('driver', 'admin') NOT NULL DEFAULT 'driver',
  full_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE,
  password VARCHAR(255) NOT NULL,
  park_id VARCHAR(20) UNIQUE,
  license_number VARCHAR(50) UNIQUE,
  plate_number VARCHAR(20) UNIQUE,
  passport_photo VARCHAR(255),
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE daily_payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  driver_id INT NOT NULL,
  payment_date DATE NOT NULL,
  amount DECIMAL(10,2) DEFAULT 500.00,
  status ENUM('paid', 'pending') DEFAULT 'pending',
  paid_at TIMESTAMP NULL,
  FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_daily (driver_id, payment_date)
);

CREATE TABLE queue_entries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  driver_id INT NOT NULL,
  join_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status ENUM('waiting', 'loading', 'completed') DEFAULT 'waiting',
  FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE cooldown_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  driver_id INT NOT NULL UNIQUE,  -- added for ON DUPLICATE KEY UPDATE
  last_join TIMESTAMP NOT NULL,
  FOREIGN KEY (driver_id) REFERENCES users(id)
);