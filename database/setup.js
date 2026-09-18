/**
 * Smart Campus Management System
 * Database Initialization and Seeding Script
 * 
 * Sets up tables and inserts demonstration data with hashed passwords.
 */

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  multipleStatements: true
};

async function initializeDatabase() {
  console.log('====================================================');
  console.log('  Smart Campus Database Initialization Script');
  console.log('====================================================');

  let connection;
  try {
    // 1. Connect without database to ensure DB exists
    console.log(`[1/5] Connecting to MySQL server at ${dbConfig.host}:${dbConfig.port}...`);
    connection = await mysql.createConnection(dbConfig);
    console.log('      Connected successfully.');

    const dbName = process.env.DB_NAME || 'smart_campus_db';
    console.log(`[2/5] Creating database "${dbName}" if not exists...`);
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
    );
    await connection.changeUser({ database: dbName });
    console.log(`      Database "${dbName}" ready.`);

    // 2. Read and run schema.sql
    console.log('[3/5] Applying schema.sql table definitions...');
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await connection.query(schemaSql);
    console.log('      Schema applied successfully (9 normalized tables created).');

    // 3. Read and run seed.sql for base categories
    console.log('[4/5] Seeding base categories from seed.sql...');
    const seedPath = path.join(__dirname, 'seed.sql');
    const seedSql = fs.readFileSync(seedPath, 'utf8');
    await connection.query(seedSql);
    console.log('      Categories seeded successfully.');

    // 4. Create hashed demo users and detailed sample records
    console.log('[5/5] Generating demo users, roles, issues, timeline & logs...');

    // Password hashes
    const adminHash = await bcrypt.hash('Admin@123', 10);
    const staffHash = await bcrypt.hash('Staff@123', 10);
    const studentHash = await bcrypt.hash('Student@123', 10);

    // Seed Admin
    const [adminResult] = await connection.execute(
      `INSERT INTO users (full_name, email, password_hash, role, phone) 
       VALUES (?, ?, ?, 'admin', ?) 
       ON DUPLICATE KEY UPDATE full_name=VALUES(full_name), password_hash=VALUES(password_hash)`,
      ['Campus Chief Administrator', 'admin@smartcampus.edu', adminHash, '+1 800-555-0199']
    );

    // Seed Staff Members
    const staffMembers = [
      {
        name: 'John Miller',
        email: 'staff.electrical@smartcampus.edu',
        phone: '+1 555-0101',
        empId: 'EMP-ELEC-01',
        dept: 'Electrical Engineering & Maintenance',
        designation: 'Senior Electrical Engineer',
        spec: 'Power Distribution & High Voltage'
      },
      {
        name: 'Robert Vance',
        email: 'staff.plumbing@smartcampus.edu',
        phone: '+1 555-0102',
        empId: 'EMP-PLUMB-02',
        dept: 'Facilities & Sanitation Dept',
        designation: 'Lead Maintenance Specialist',
        spec: 'Water Supply, Hydrants & Drainage'
      },
      {
        name: 'Sarah Connor',
        email: 'staff.it@smartcampus.edu',
        phone: '+1 555-0103',
        empId: 'EMP-IT-03',
        dept: 'Campus IT Infrastructure & Labs',
        designation: 'Systems & Network Administrator',
        spec: 'Enterprise Networking & Lab Hardware'
      }
    ];

    const staffIds = {};
    for (const st of staffMembers) {
      const [uRes] = await connection.execute(
        `INSERT INTO users (full_name, email, password_hash, role, phone) 
         VALUES (?, ?, ?, 'staff', ?) 
         ON DUPLICATE KEY UPDATE full_name=VALUES(full_name), password_hash=VALUES(password_hash)`,
        [st.name, st.email, staffHash, st.phone]
      );
      
      const [uRow] = await connection.execute('SELECT id FROM users WHERE email = ?', [st.email]);
      const userId = uRow[0].id;

      await connection.execute(
        `INSERT INTO staff (user_id, employee_id, department, designation, specialization) 
         VALUES (?, ?, ?, ?, ?) 
         ON DUPLICATE KEY UPDATE department=VALUES(department), designation=VALUES(designation)`,
        [userId, st.empId, st.dept, st.designation, st.spec]
      );

      const [sRow] = await connection.execute('SELECT id FROM staff WHERE user_id = ?', [userId]);
      staffIds[st.email] = sRow[0].id;
    }

    // Seed Students
    const studentsData = [
      {
        name: 'Alex Johnson',
        email: 'student1@smartcampus.edu',
        phone: '+1 555-0201',
        roll: 'CS2023001',
        dept: 'Computer Science & Engineering',
        sem: '6th Semester',
        block: 'Block A (Boys Hostel)',
        room: 'A-204'
      },
      {
        name: 'Priya Sharma',
        email: 'student2@smartcampus.edu',
        phone: '+1 555-0202',
        roll: 'EC2023045',
        dept: 'Electronics & Communication',
        sem: '4th Semester',
        block: 'Block B (Girls Hostel)',
        room: 'B-112'
      },
      {
        name: 'Michael Brown',
        email: 'student3@smartcampus.edu',
        phone: '+1 555-0203',
        roll: 'ME2023089',
        dept: 'Mechanical Engineering',
        sem: '8th Semester',
        block: 'Block C (Boys Hostel)',
        room: 'C-301'
      }
    ];

    const studentIds = {};
    for (const std of studentsData) {
      await connection.execute(
        `INSERT INTO users (full_name, email, password_hash, role, phone) 
         VALUES (?, ?, ?, 'student', ?) 
         ON DUPLICATE KEY UPDATE full_name=VALUES(full_name), password_hash=VALUES(password_hash)`,
        [std.name, std.email, studentHash, std.phone]
      );

      const [uRow] = await connection.execute('SELECT id FROM users WHERE email = ?', [std.email]);
      const userId = uRow[0].id;

      await connection.execute(
        `INSERT INTO students (user_id, roll_number, department, semester, hostel_block, room_number) 
         VALUES (?, ?, ?, ?, ?, ?) 
         ON DUPLICATE KEY UPDATE roll_number=VALUES(roll_number), department=VALUES(department)`,
        [userId, std.roll, std.dept, std.sem, std.block, std.room]
      );

      const [stdRow] = await connection.execute('SELECT id FROM students WHERE user_id = ?', [userId]);
      studentIds[std.email] = stdRow[0].id;
    }

    // Seed Sample Issues with Realistic Campus Analytics Distribution
    const sampleIssues = [
      {
        code: 'ISS-2026-0001',
        studentEmail: 'student1@smartcampus.edu',
        catName: 'Computer / Laboratory',
        staffEmail: 'staff.it@smartcampus.edu',
        title: 'Repeated Desktop Crashes and BSOD on Systems 12-16',
        desc: 'Workstations 12, 13, 14, 15, and 16 in Computer Lab 2 are experiencing recurring Blue Screen crashes during OS kernel compilation practicals.',
        location: 'Computer Lab 2, 3rd Floor, Tech Building',
        block: 'Tech Block',
        priority: 'critical',
        status: 'in_progress',
        notes: 'Identified corrupted RAM modules on system 14. Replacement DDR4 sticks requested from campus inventory.'
      },
      {
        code: 'ISS-2026-0002',
        studentEmail: 'student2@smartcampus.edu',
        catName: 'Plumbing',
        staffEmail: 'staff.plumbing@smartcampus.edu',
        title: 'Severe Water Leakage and Flooding in 2nd Floor Washroom',
        desc: 'The main inlet valve under the third washbasin ruptured, leading to water spilling into the corridor.',
        location: 'Block A, 2nd Floor West Wing',
        block: 'Block A',
        priority: 'high',
        status: 'resolved',
        notes: 'Replaced ruptured valve with heavy-duty brass coupling. Mopping completed by sanitation team.',
        resolvedAt: new Date(Date.now() - 3600 * 1000 * 4)
      },
      {
        code: 'ISS-2026-0003',
        studentEmail: 'student2@smartcampus.edu',
        catName: 'Internet / Wi-Fi',
        staffEmail: 'staff.it@smartcampus.edu',
        title: 'Wi-Fi Access Point 4B Dropping Packets and Authentications',
        desc: 'Students in Block B corridor cannot maintain sustained VPN or portal sessions due to continuous AP reboots.',
        location: 'Block B, 1st Floor Corridor near Room 115',
        block: 'Block B',
        priority: 'medium',
        status: 'assigned',
        notes: 'Assigned to IT networking team for firmware diagnostics.'
      },
      {
        code: 'ISS-2026-0004',
        studentEmail: 'student3@smartcampus.edu',
        catName: 'Electrical',
        staffEmail: null,
        title: 'Streetlight Flashing & Main Breaker Tripping near North Gate',
        desc: 'The high-mast streetlight pole #3 flickers erratically and tripped the secondary substation breaker yesterday evening.',
        location: 'North Campus Perimeter Gate 3',
        block: 'North Campus',
        priority: 'critical',
        status: 'pending',
        notes: null
      },
      {
        code: 'ISS-2026-0005',
        studentEmail: 'student1@smartcampus.edu',
        catName: 'Classroom',
        staffEmail: 'staff.it@smartcampus.edu',
        title: 'Interactive Smartboard HDMI Audio & Touch Calibration Lag',
        desc: 'Lecturers are unable to transmit audio through ceiling speakers during AI lecture seminars.',
        location: 'Seminar Hall 1, Block B',
        block: 'Block B',
        priority: 'medium',
        status: 'in_progress',
        notes: 'Audio DAC interface recalibrated. Testing touch sensor ribbon cable.'
      },
      {
        code: 'ISS-2026-0006',
        studentEmail: 'student3@smartcampus.edu',
        catName: 'Hostel',
        staffEmail: 'staff.plumbing@smartcampus.edu',
        title: 'Geyser Heating Element Inoperative in Room C-301 Common Washroom',
        desc: 'Water heater power LED illuminates but water remains cold despite 30 minutes of preheating.',
        location: 'Hostel Block C, 3rd Floor East Wing',
        block: 'Hostel Block C',
        priority: 'low',
        status: 'closed',
        notes: 'Replaced 2000W heating thermostat coil. Student verified hot water flow.',
        resolvedAt: new Date(Date.now() - 3600 * 1000 * 24),
        closedAt: new Date(Date.now() - 3600 * 1000 * 12)
      },
      {
        code: 'ISS-2026-0007',
        studentEmail: 'student1@smartcampus.edu',
        catName: 'Electrical',
        staffEmail: 'staff.electrical@smartcampus.edu',
        title: 'Sparks from Air Conditioner Power Socket in Lab 2',
        desc: 'Visible sparking and scorched smell detected when turning on the auxiliary cooling unit.',
        location: 'Computer Lab 2, Tech Block',
        block: 'Tech Block',
        priority: 'high',
        status: 'assigned',
        notes: 'Power isolated at main MCB. Replacement 20A socket scheduled.'
      }
    ];

    for (const iss of sampleIssues) {
      // Find category id
      const [cRows] = await connection.execute('SELECT id FROM categories WHERE name = ?', [iss.catName]);
      const catId = cRows.length ? cRows[0].id : 1;
      const sId = studentIds[iss.studentEmail];
      const stId = iss.staffEmail ? staffIds[iss.staffEmail] : null;

      const [iRes] = await connection.execute(
        `INSERT INTO issues 
         (tracking_code, student_id, category_id, assigned_staff_id, title, description, location, block_area, priority, status, resolution_notes, resolved_at, closed_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE status=VALUES(status), resolution_notes=VALUES(resolution_notes)`,
        [
          iss.code,
          sId,
          catId,
          stId,
          iss.title,
          iss.desc,
          iss.location,
          iss.block,
          iss.priority,
          iss.status,
          iss.notes,
          iss.resolvedAt || null,
          iss.closedAt || null
        ]
      );

      const [issueRow] = await connection.execute('SELECT id FROM issues WHERE tracking_code = ?', [iss.code]);
      const issueId = issueRow[0].id;

      // Seed timeline audit
      await connection.execute(
        `INSERT INTO issue_updates (issue_id, updated_by_user_id, previous_status, new_status, remarks) 
         VALUES (?, 1, NULL, 'pending', 'Issue reported by student via online portal')`,
        [issueId]
      );

      if (iss.status !== 'pending') {
        await connection.execute(
          `INSERT INTO issue_updates (issue_id, updated_by_user_id, previous_status, new_status, remarks) 
           VALUES (?, 1, 'pending', 'assigned', 'Assigned by Administrator to designated staff specialist')`,
          [issueId]
        );
      }

      if (iss.status === 'in_progress' || iss.status === 'resolved' || iss.status === 'closed') {
        await connection.execute(
          `INSERT INTO issue_updates (issue_id, updated_by_user_id, previous_status, new_status, remarks) 
           VALUES (?, 1, 'assigned', 'in_progress', 'Staff initiated physical inspection and root cause diagnosis')`,
          [issueId]
        );
      }

      if (iss.status === 'resolved' || iss.status === 'closed') {
        await connection.execute(
          `INSERT INTO issue_updates (issue_id, updated_by_user_id, previous_status, new_status, remarks) 
           VALUES (?, 1, 'in_progress', 'resolved', 'Defect rectified, operational tests verified successfully')`,
          [issueId]
        );
      }

      if (iss.status === 'closed') {
        await connection.execute(
          `INSERT INTO issue_updates (issue_id, updated_by_user_id, previous_status, new_status, remarks) 
           VALUES (?, 1, 'resolved', 'closed', 'Student confirmed resolution and ticket formally closed')`,
          [issueId]
        );
      }
    }

    // Seed Feedback for Resolved Issue #2
    const [iss2Row] = await connection.execute('SELECT id FROM issues WHERE tracking_code = "ISS-2026-0002"');
    if (iss2Row.length > 0) {
      const iss2Id = iss2Row[0].id;
      const s2Id = studentIds['student2@smartcampus.edu'];
      await connection.execute(
        `INSERT INTO feedback (issue_id, student_id, rating, comments) 
         VALUES (?, ?, 5, 'Exceptional turnaround time! Plumbing engineer arrived within 15 minutes and water leak was halted immediately.') 
         ON DUPLICATE KEY UPDATE rating=VALUES(rating), comments=VALUES(comments)`,
        [iss2Id, s2Id]
      );
    }

    // Seed Sample Notifications
    await connection.execute(
      `INSERT INTO notifications (user_id, title, message, type) VALUES
       (1, 'New Critical Issue Reported', 'Critical issue ISS-2026-0004 (Streetlight / Substation Breaker) filed in North Campus.', 'danger'),
       (2, 'New Issue Assigned', 'You have been assigned to issue ISS-2026-0007 in Tech Block.', 'info'),
       (4, 'Issue Assigned to Specialist', 'Your issue ISS-2026-0001 has been assigned to Systems Administrator Sarah Connor.', 'info'),
       (5, 'Issue Resolved', 'Your reported water leakage in Block A (ISS-2026-0002) has been resolved. Please rate the service.', 'success')`
    );

    // Seed Audit Logs
    await connection.execute(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address, details) VALUES
       (1, 'SYSTEM_INITIALIZATION', 'SYSTEM', 1, '127.0.0.1', 'Smart Campus Relational Database schema initialized and seeded'),
       (1, 'CATEGORY_MANAGEMENT', 'CATEGORY', 1, '127.0.0.1', 'Initialized 11 standard campus service categories'),
       (4, 'ISSUE_CREATED', 'ISSUE', 1, '127.0.0.1', 'Student Alex Johnson created issue ISS-2026-0001 (Tech Block Lab 2)'),
       (1, 'ISSUE_ASSIGNED', 'ISSUE', 1, '127.0.0.1', 'Admin assigned Sarah Connor (IT) to ISS-2026-0001')`
    );

    console.log('====================================================');
    console.log('  Database Initialization Successfully Completed!');
    console.log('====================================================');
    console.log('Demo Accounts:');
    console.log('  • Admin:   admin@smartcampus.edu             / Admin@123');
    console.log('  • Staff:   staff.it@smartcampus.edu          / Staff@123');
    console.log('  • Staff:   staff.electrical@smartcampus.edu  / Staff@123');
    console.log('  • Staff:   staff.plumbing@smartcampus.edu    / Staff@123');
    console.log('  • Student: student1@smartcampus.edu          / Student@123');
    console.log('  • Student: student2@smartcampus.edu          / Student@123');
    console.log('  • Student: student3@smartcampus.edu          / Student@123');
    console.log('====================================================');

  } catch (error) {
    console.error('Database Initialization Failed:', error);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

if (require.main === module) {
  initializeDatabase();
}

module.exports = { initializeDatabase };
