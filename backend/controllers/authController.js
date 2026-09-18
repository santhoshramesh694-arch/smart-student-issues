/**
 * Authentication Controller
 * Handles user registration, login, token generation, profile retrieval & updates.
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const { logAction } = require('../services/auditService');

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET || 'campus_jwt_super_secret_key_2026_secure_fyp',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// POST /api/auth/register
const register = async (req, res, next) => {
  const connection = await db.getConnection();
  try {
    const {
      full_name,
      email,
      password,
      phone,
      roll_number,
      department,
      semester,
      hostel_block,
      room_number
    } = req.body;

    if (!full_name || !email || !password || !roll_number || !department) {
      return sendError(res, 'Please provide all required fields (full_name, email, password, roll_number, department).', 400);
    }

    // Check if email already exists
    const [existing] = await connection.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return sendError(res, 'An account with this email already exists.', 409);
    }

    // Check if roll number already exists
    const [existingRoll] = await connection.execute('SELECT id FROM students WHERE roll_number = ?', [roll_number]);
    if (existingRoll.length > 0) {
      return sendError(res, 'A student with this Roll Number is already registered.', 409);
    }

    await connection.beginTransaction();

    const passwordHash = await bcrypt.hash(password, 10);

    const [userResult] = await connection.execute(
      `INSERT INTO users (full_name, email, password_hash, role, phone) VALUES (?, ?, ?, 'student', ?)`,
      [full_name, email, passwordHash, phone || null]
    );
    const userId = userResult.insertId;

    const [studentResult] = await connection.execute(
      `INSERT INTO students (user_id, roll_number, department, semester, hostel_block, room_number) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, roll_number, department, semester || null, hostel_block || null, room_number || null]
    );
    const studentId = studentResult.insertId;

    await connection.commit();

    const userPayload = {
      id: userId,
      student_id: studentId,
      full_name,
      email,
      role: 'student',
      phone: phone || null,
      student_profile: {
        roll_number,
        department,
        semester,
        hostel_block,
        room_number
      }
    };

    const token = generateToken(userPayload);

    await logAction({
      userId,
      action: 'USER_REGISTER',
      entityType: 'USER',
      entityId: userId,
      ipAddress: req.ip,
      details: `Student ${full_name} (${roll_number}) registered successfully`
    });

    return sendSuccess(res, { token, user: userPayload }, 'Student registered successfully.', 201);
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
};

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendError(res, 'Please provide email and password.', 400);
    }

    const [users] = await db.execute(
      `SELECT id, full_name, email, password_hash, role, phone, avatar_url, is_active FROM users WHERE email = ?`,
      [email]
    );

    if (users.length === 0) {
      return sendError(res, 'Invalid email or password credentials.', 401);
    }

    const user = users[0];

    if (!user.is_active) {
      return sendError(res, 'Your account has been deactivated. Please contact campus admin.', 403);
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return sendError(res, 'Invalid email or password credentials.', 401);
    }

    let profile = null;
    let studentId = null;
    let staffId = null;

    if (user.role === 'student') {
      const [students] = await db.execute('SELECT id, roll_number, department, semester, hostel_block, room_number FROM students WHERE user_id = ?', [user.id]);
      if (students.length > 0) {
        studentId = students[0].id;
        profile = students[0];
      }
    } else if (user.role === 'staff') {
      const [staff] = await db.execute('SELECT id, employee_id, department, designation, specialization FROM staff WHERE user_id = ?', [user.id]);
      if (staff.length > 0) {
        staffId = staff[0].id;
        profile = staff[0];
      }
    }

    const token = generateToken(user);

    const userResponse = {
      id: user.id,
      student_id: studentId,
      staff_id: staffId,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      avatar_url: user.avatar_url,
      profile
    };

    await logAction({
      userId: user.id,
      action: 'USER_LOGIN',
      entityType: 'USER',
      entityId: user.id,
      ipAddress: req.ip,
      details: `User ${user.email} (${user.role}) logged in`
    });

    return sendSuccess(res, { token, user: userResponse }, 'Login successful.');
  } catch (error) {
    next(error);
  }
};

// GET /api/auth/me
const getMe = async (req, res, next) => {
  try {
    return sendSuccess(res, { user: req.user }, 'Current user profile retrieved.');
  } catch (error) {
    next(error);
  }
};

// PUT /api/auth/profile
const updateProfile = async (req, res, next) => {
  const connection = await db.getConnection();
  try {
    const { full_name, phone, avatar_url, semester, hostel_block, room_number, specialization } = req.body;
    const userId = req.user.id;

    await connection.beginTransaction();

    await connection.execute(
      `UPDATE users SET full_name = COALESCE(?, full_name), phone = COALESCE(?, phone), avatar_url = COALESCE(?, avatar_url) WHERE id = ?`,
      [full_name || null, phone || null, avatar_url || null, userId]
    );

    if (req.user.role === 'student') {
      await connection.execute(
        `UPDATE students SET semester = COALESCE(?, semester), hostel_block = COALESCE(?, hostel_block), room_number = COALESCE(?, room_number) WHERE user_id = ?`,
        [semester || null, hostel_block || null, room_number || null, userId]
      );
    } else if (req.user.role === 'staff') {
      await connection.execute(
        `UPDATE staff SET specialization = COALESCE(?, specialization) WHERE user_id = ?`,
        [specialization || null, userId]
      );
    }

    await connection.commit();

    await logAction({
      userId,
      action: 'PROFILE_UPDATED',
      entityType: 'USER',
      entityId: userId,
      ipAddress: req.ip,
      details: `User ${req.user.email} updated profile details`
    });

    return sendSuccess(res, {}, 'Profile updated successfully.');
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
};

// PUT /api/auth/password
const updatePassword = async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;
    const userId = req.user.id;

    if (!current_password || !new_password) {
      return sendError(res, 'Current password and new password are required.', 400);
    }

    if (new_password.length < 6) {
      return sendError(res, 'New password must be at least 6 characters long.', 400);
    }

    const [rows] = await db.execute('SELECT password_hash FROM users WHERE id = ?', [userId]);
    const isMatch = await bcrypt.compare(current_password, rows[0].password_hash);
    if (!isMatch) {
      return sendError(res, 'Current password entered is incorrect.', 400);
    }

    const newHash = await bcrypt.hash(new_password, 10);
    await db.execute('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, userId]);

    await logAction({
      userId,
      action: 'PASSWORD_CHANGED',
      entityType: 'USER',
      entityId: userId,
      ipAddress: req.ip,
      details: `User ${req.user.email} changed password`
    });

    return sendSuccess(res, {}, 'Password updated successfully.');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  updatePassword
};
