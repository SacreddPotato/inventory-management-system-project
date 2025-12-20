-- Run this to set up MySQL:
-- mysql -u root -p < schema.sql

CREATE DATABASE IF NOT EXISTS inventory_db;
USE inventory_db;

CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    count INT DEFAULT 0,
    reserved INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS repair_bin (
    id VARCHAR(50) PRIMARY KEY,
    count INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS trash_bin (
    id VARCHAR(50) PRIMARY KEY,
    count INT DEFAULT 0
);

-- Sample data
INSERT IGNORE INTO products (id, name, count, reserved) VALUES
    ('101', 'Wireless Mouse', 50, 2),
    ('102', 'HDMI Cable', 12, 0),
    ('103', 'USB Keyboard', 0, 0);
