/**
 * User Controller
 * Administrative CRUD for Student, Staff, and Administrator accounts.
 */

const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const { logAction } = require('../services/auditService');

// GET /api/users (Admin only)
const getUsers = async (req, res, next) => {
  try {
    const { role, search = '', page = 1, limit = 15 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    let whereConditions = [];
    const params = [];

    if (role) {
      whereConditions.push('u.role = ?');
      params.push(role);
    }

    if (search) {
      whereConditions.push('(u.full_name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)');
      const searchWild = `%${search}%`;
      params.push(searchWild, searchWild, searchWild);
    }

    const whereSql = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const countQuery = `SELECT COUNT(*) as total FROM users u ${whereSql}`;
    const [countRows] = await db.execute(countQuery, params);
    const totalRecords = countRows[0].total;

    const dataQuery = `
      SELECT 
        u.id,
        u.full_name,
        u.email,
        u.role,
        u.phone,
        u.avatar_url,
        u.is_active,
        u.created_at,
        std.id AS student_id,
        std.roll_number,
        std.department AS student_department,
        std.semester,
        std.hostel_block,
        std.room_number,
        stf.id AS staff_id,
        stf.employee_id,
        stf.department AS staff_department,
        stf.designation,
        stf.specialization
      FROM users u
      LEFT JOIN students std ON std.user_id = u.id
      LEFT JOIN staff stf ON stf.user_id = u.id
      ${whereSql}
      ORDER BY u.created_at DESC
      LIMIT ${parseInt(limit, 10)} OFFSET ${offset}
    `;

    const [users] = await db.execute(dataQuery, params);

    return sendSuccess(res, {
      users,
      pagination: {
        total: totalRecords,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalPages: Math.ceil(totalRecords / parseInt(limit, 10))
      }
    }, 'Users retrieved.');
  } catch (error) {
    next(error);
  }
};

// GET /api/users/staff/list (Available staff for task assignments)
const getStaffList = async (req, res, next) => {
  try {
    const query = `
      SELECT 
        s.id AS staff_id,
        s.employee_id,
        s.department,
        s.designation,
        s.specialization,
        u.id AS user_id,
        u.full_name,
        u.email,
        u.phone,
        (SELECT COUNT(*) FROM issues i WHERE i.assigned_staff_id = s.id AND i.status IN ('assigned', 'in_progress')) AS active_workload
      FROM staff s
      JOIN users u ON s.user_id = u.id
      WHERE u.is_active = 1
      ORDER BY u.full_name ASC
    `;
    const [staffMembers] = await db.execute(query);
    return sendSuccess(res, { staff: staffMembers }, 'Staff list retrieved.');
  } catch (error) {
    next(error);
  }
};

// GET /api/users/:id
const getUserById = async (req, res, next) => {
  try {
    const userId = req.params.id;
    const query = `
      SELECT 
        u.id, u.full_name, u.email, u.role, u.phone, u.avatar_url, u.is_active, u.created_at,
        std.roll_number, std.department AS student_department, std.semester, std.hostel_block, std.room_number,
        stf.employee_id, stf.department AS staff_department, stf.designation, stf.specialization
      FROM users u
      LEFT JOIN students std ON std.user_id = u.id
      LEFT JOIN staff stf ON stf.user_id = u.id
      WHERE u.id = ?
    `;
    const [rows] = await db.execute(query, [userId]);
    if (rows.length === 0) {
      return sendError(res, 'User not found.', 404);
    }
    return sendSuccess(res, { user: rows[0] }, 'User retrieved.');
  } catch (error) {
    next(error);
  }
};

// POST /api/users (Admin creates staff or student directly)
const createUser = async (req, res, next) => {
  const connection = await db.getConnection();
  try {
    const {
      full_name,
      email,
      password,
      role,
      phone,
      roll_number,
      department,
      semester,
      hostel_block,
      room_number,
      employee_id,
      designation,
      specialization
    } = req.body;

    if (!full_name || !email || !password || !role) {
      return sendError(res, 'Full name, email, password, and role are required.', 400);
    }

    const [existing] = await connection.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return sendError(res, 'A user with this email already exists.', 409);
    }

    await connection.beginTransaction();

    const passwordHash = await bcrypt.hash(password, 10);

    const [userRes] = await connection.execute(
      `INSERT INTO users (full_name, email, password_hash, role, phone, is_active) VALUES (?, ?, ?, ?, ?, 1)`,
      [full_name, email, passwordHash, role, phone || null]
    );
    const userId = userRes.insertId;

    if (role === 'student') {
      await connection.execute(
        `INSERT INTO students (user_id, roll_number, department, semester, hostel_block, room_number)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, roll_number || `REG-${Date.now().toString().slice(-6)}`, department || 'General', semester || null, hostel_block || null, room_number || null]
      );
    } else if (role === 'staff') {
      await connection.execute(
        `INSERT INTO staff (user_id, employee_id, department, designation, specialization)
         VALUES (?, ?, ?, ?, ?)`,
        [userId, employee_id || `EMP-${Date.now().toString().slice(-4)}`, department || 'Maintenance', designation || 'Technician', specialization || null]
      );
    }

    await connection.commit();

    await logAction({
      userId: req.user.id,
      action: 'USER_CREATED_BY_ADMIN',
      entityType: 'USER',
      entityId: userId,
      ipAddress: req.ip,
      details: `Admin created ${role} user: ${full_name} (${email})`
    });

    return sendSuccess(res, { id: userId, email, role }, 'User created successfully.', 201);
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
};

// PUT /api/users/:id (Admin updates user)
const updateUser = async (req, res, next) => {
  const connection = await db.getConnection();
  try {
    const userId = req.params.id;
    const {
      full_name,
      email,
      phone,
      is_active,
      department,
      semester,
      hostel_block,
      room_number,
      designation,
      specialization
    } = req.body;

    const [rows] = await connection.execute('SELECT * FROM users WHERE id = ?', [userId]);
    if (rows.length === 0) {
      return sendError(res, 'User not found.', 404);
    }
    const user = rows[0];

    await connection.beginTransaction();

    await connection.execute(
      `UPDATE users SET 
        full_name = COALESCE(?, full_name),
        email = COALESCE(?, email),
        phone = COALESCE(?, phone),
        is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [full_name || null, email || null, phone || null, is_active !== undefined ? is_active : null, userId]
    );

    if (user.role === 'student') {
      await connection.execute(
        `UPDATE students SET 
          department = COALESCE(?, department),
          semester = COALESCE(?, semester),
          hostel_block = COALESCE(?, hostel_block),
          room_number = COALESCE(?, room_number)
         WHERE user_id = ?`,
        [department || null, semester || null, hostel_block || null, room_number || null, userId]
      );
    } else if (user.role === 'staff') {
      await connection.execute(
        `UPDATE staff SET 
          department = COALESCE(?, department),
          designation = COALESCE(?, designation),
          specialization = COALESCE(?, specialization)
         WHERE user_id = ?`,
        [department || null, designation || null, specialization || null, userId]
      );
    }

    await connection.commit();

    await logAction({
      userId: req.user.id,
      action: 'USER_UPDATED_BY_ADMIN',
      entityType: 'USER',
      entityId: userId,
      ipAddress: req.ip,
      details: `Admin updated user record for ${user.email}`
    });

    return sendSuccess(res, {}, 'User updated successfully.');
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
};

// DELETE /api/users/:id (Admin deletes or deactivates user)
const deleteUser = async (req, res, next) => {
  try {
    const userId = req.params.id;

    if (parseInt(userId, 10) === req.user.id) {
      return sendError(res, 'You cannot delete your own active administrator account.', 400);
    }

    const [rows] = await db.execute('SELECT full_name, email, role FROM users WHERE id = ?', [userId]);
    if (rows.length === 0) {
      return sendError(res, 'User not found.', 404);
    }
    const user = rows[0];

    // Soft delete / deactivate to retain referential integrity on audit trails and issues
    await db.execute('UPDATE users SET is_active = 0 WHERE id = ?', [userId]);

    await logAction({
      userId: req.user.id,
      action: 'USER_DEACTIVATED',
      entityType: 'USER',
      entityId: userId,
      ipAddress: req.ip,
      details: `Admin deactivated account of ${user.full_name} (${user.email})`
    });

    return sendSuccess(res, {}, `User account for ${user.full_name} has been deactivated.`);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  getStaffList,
  getUserById,
  createUser,
  updateUser,
  deleteUser
};
