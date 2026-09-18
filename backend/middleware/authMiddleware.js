/**
 * Authentication and Role-Based Authorization Middleware
 */

const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { sendError } = require('../utils/responseHandler');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, 'Authentication token missing or invalid format.', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'campus_jwt_super_secret_key_2026_secure_fyp');

    // Verify user exists and is active
    const [users] = await db.execute(
      'SELECT id, full_name, email, role, phone, avatar_url, is_active FROM users WHERE id = ?',
      [decoded.id]
    );

    if (users.length === 0) {
      return sendError(res, 'User associated with token no longer exists.', 401);
    }

    const user = users[0];
    if (!user.is_active) {
      return sendError(res, 'Your account has been deactivated. Please contact campus admin.', 403);
    }

    // Attach role-specific entity IDs if student or staff
    if (user.role === 'student') {
      const [students] = await db.execute('SELECT id, roll_number, department, semester, hostel_block, room_number FROM students WHERE user_id = ?', [user.id]);
      if (students.length > 0) {
        user.student_id = students[0].id;
        user.student_profile = students[0];
      }
    } else if (user.role === 'staff') {
      const [staffMembers] = await db.execute('SELECT id, employee_id, department, designation, specialization FROM staff WHERE user_id = ?', [user.id]);
      if (staffMembers.length > 0) {
        user.staff_id = staffMembers[0].id;
        user.staff_profile = staffMembers[0];
      }
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return sendError(res, 'Authentication token expired or invalid.', 401);
    }
    return next(error);
  }
};

/**
 * Role-Based Access Control Guard
 * @param  {...string} allowedRoles - e.g. 'admin', 'staff', 'student'
 */
const requireRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 'Unauthenticated user.', 401);
    }
    if (!allowedRoles.includes(req.user.role)) {
      return sendError(res, `Forbidden: Requires one of [${allowedRoles.join(', ')}] roles.`, 403);
    }
    next();
  };
};

module.exports = {
  authenticateToken,
  requireRoles
};
