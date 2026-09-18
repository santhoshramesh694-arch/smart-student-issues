-- ==========================================================
-- Smart Campus Issue & Resource Management System
-- Seed Data Script
-- Default Categories, Demo Users, Sample Issues & Analytics Data
-- ==========================================================

USE smart_campus_db;

SET FOREIGN_KEY_CHECKS = 0;

-- 1. SEED DEFAULT CATEGORIES
INSERT INTO categories (id, name, description, icon, is_active) VALUES
(1, 'Electrical', 'Power cuts, malfunctioning switches, broken fans, streetlights, and wiring issues.', 'fa-bolt', 1),
(2, 'Plumbing', 'Water leakage, clogged drainage, broken faucets, and restroom plumbing.', 'fa-faucet-drip', 1),
(3, 'Internet / Wi-Fi', 'Campus Wi-Fi connectivity drop, slow speeds, access point outages, and LAN port issues.', 'fa-wifi', 1),
(4, 'Computer / Laboratory', 'Lab desktop crashes, monitor failure, software installation, and projector faults.', 'fa-desktop', 1),
(5, 'Classroom', 'Broken benches, whiteboard damage, podium microphone issues, and smartboard setup.', 'fa-chalkboard-user', 1),
(6, 'Hostel', 'Room door locks, cupboard damage, common room facilities, and water heaters.', 'fa-bed', 1),
(7, 'Library', 'Air conditioning, digital kiosk dysfunction, reading lamp failure, and book search terminals.', 'fa-book-open', 1),
(8, 'Cleanliness', 'Waste bin overflow, corridor sanitation, washroom hygiene, and campus litter.', 'fa-broom', 1),
(9, 'Security', 'CCTV camera outages, gate barrier malfunction, security lights, and access badge issues.', 'fa-shield-halved', 1),
(10, 'Transportation', 'Campus shuttle bus delays, tracking device issues, bicycle stand repairs.', 'fa-bus', 1),
(11, 'Other', 'General campus maintenance, civil infrastructure, and miscellaneous grievances.', 'fa-circle-question', 1)
ON DUPLICATE KEY UPDATE name=VALUES(name);

SET FOREIGN_KEY_CHECKS = 1;
