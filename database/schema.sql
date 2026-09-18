-- ==========================================================
-- Smart Campus Issue & Resource Management System
-- Relational Database Schema (MySQL / MariaDB)
-- Normalized (3NF) with Constraints, Foreign Keys & Indexes
-- ==========================================================

-- Drop database if exists and re-create for clean initialization
CREATE DATABASE IF NOT EXISTS smart_campus_db 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE smart_campus_db;

-- Disable foreign key checks during schema creation
SET FOREIGN_KEY_CHECKS = 0;

-- 1. USERS TABLE (Core Authentication & System Roles)
DROP TABLE IF EXISTS users;
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('student', 'staff', 'admin') NOT NULL DEFAULT 'student',
    phone VARCHAR(20) DEFAULT NULL,
    avatar_url VARCHAR(255) DEFAULT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_users_email (email),
    INDEX idx_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. STUDENTS TABLE (Extends Users with Academic/Hostel info)
DROP TABLE IF EXISTS students;
CREATE TABLE students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    roll_number VARCHAR(50) NOT NULL UNIQUE,
    department VARCHAR(100) NOT NULL,
    semester VARCHAR(20) DEFAULT NULL,
    hostel_block VARCHAR(50) DEFAULT NULL,
    room_number VARCHAR(20) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_students_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_students_roll (roll_number),
    INDEX idx_students_dept (department)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. STAFF TABLE (Extends Users with Staff/Department credentials)
DROP TABLE IF EXISTS staff;
CREATE TABLE staff (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    employee_id VARCHAR(50) NOT NULL UNIQUE,
    department VARCHAR(100) NOT NULL,
    designation VARCHAR(100) NOT NULL,
    specialization VARCHAR(100) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_staff_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_staff_empid (employee_id),
    INDEX idx_staff_dept (department)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. CATEGORIES TABLE (Campus Issue Taxonomy)
DROP TABLE IF EXISTS categories;
CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(80) NOT NULL UNIQUE,
    description VARCHAR(255) DEFAULT NULL,
    icon VARCHAR(50) DEFAULT 'fa-wrench',
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. ISSUES TABLE (Primary Issue Ticket)
DROP TABLE IF EXISTS issues;
CREATE TABLE issues (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tracking_code VARCHAR(20) NOT NULL UNIQUE,
    student_id INT NOT NULL,
    category_id INT NOT NULL,
    assigned_staff_id INT DEFAULT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    location VARCHAR(150) NOT NULL,
    block_area VARCHAR(80) NOT NULL,
    priority ENUM('low', 'medium', 'high', 'critical') NOT NULL DEFAULT 'medium',
    status ENUM('pending', 'assigned', 'in_progress', 'resolved', 'closed', 'rejected') NOT NULL DEFAULT 'pending',
    issue_image_url VARCHAR(255) DEFAULT NULL,
    resolution_image_url VARCHAR(255) DEFAULT NULL,
    resolution_notes TEXT DEFAULT NULL,
    resolved_at DATETIME DEFAULT NULL,
    closed_at DATETIME DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_issues_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE RESTRICT,
    CONSTRAINT fk_issues_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
    CONSTRAINT fk_issues_staff FOREIGN KEY (assigned_staff_id) REFERENCES staff(id) ON DELETE SET NULL,
    INDEX idx_issues_tracking (tracking_code),
    INDEX idx_issues_status (status),
    INDEX idx_issues_priority (priority),
    INDEX idx_issues_block (block_area),
    INDEX idx_issues_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. ISSUE_UPDATES TABLE (Status Transition & Timeline History)
DROP TABLE IF EXISTS issue_updates;
CREATE TABLE issue_updates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    issue_id INT NOT NULL,
    updated_by_user_id INT NOT NULL,
    previous_status VARCHAR(30) DEFAULT NULL,
    new_status VARCHAR(30) NOT NULL,
    remarks TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_updates_issue FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE,
    CONSTRAINT fk_updates_user FOREIGN KEY (updated_by_user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_updates_issue (issue_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. FEEDBACK TABLE (Post-Resolution Student Rating & Review)
DROP TABLE IF EXISTS feedback;
CREATE TABLE feedback (
    id INT AUTO_INCREMENT PRIMARY KEY,
    issue_id INT NOT NULL UNIQUE,
    student_id INT NOT NULL,
    rating TINYINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comments TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_feedback_issue FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE,
    CONSTRAINT fk_feedback_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. NOTIFICATIONS TABLE (System & In-App Alerts)
DROP TABLE IF EXISTS notifications;
CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    issue_id INT DEFAULT NULL,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    type ENUM('info', 'warning', 'success', 'danger') DEFAULT 'info',
    is_read TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_notif_issue FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE,
    INDEX idx_notif_user_unread (user_id, is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. AUDIT_LOGS TABLE (Security & Governance Trail)
DROP TABLE IF EXISTS audit_logs;
CREATE TABLE audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT DEFAULT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INT DEFAULT NULL,
    ip_address VARCHAR(45) DEFAULT NULL,
    details TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_audit_user (user_id),
    INDEX idx_audit_action (action),
    INDEX idx_audit_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;
