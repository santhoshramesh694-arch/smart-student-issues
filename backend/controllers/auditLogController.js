/**
 * Audit Log Controller
 * Provides searchable, filterable governance records for administrators.
 */

const db = require('../config/database');
const { sendSuccess, sendError } = require('../utils/responseHandler');

// GET /api/audit-logs (Admin only)
const getAuditLogs = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      action,
      entity_type,
      search = '',
      start_date,
      end_date
    } = req.query;

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const whereConditions = [];
    const params = [];

    if (action) {
      whereConditions.push('a.action = ?');
      params.push(action);
    }

    if (entity_type) {
      whereConditions.push('a.entity_type = ?');
      params.push(entity_type);
    }

    if (start_date) {
      whereConditions.push('a.created_at >= ?');
      params.push(`${start_date} 00:00:00`);
    }

    if (end_date) {
      whereConditions.push('a.created_at <= ?');
      params.push(`${end_date} 23:59:59`);
    }

    if (search) {
      whereConditions.push('(a.details LIKE ? OR a.action LIKE ? OR u.full_name LIKE ? OR u.email LIKE ?)');
      const searchWild = `%${search}%`;
      params.push(searchWild, searchWild, searchWild, searchWild);
    }

    const whereSql = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const countQuery = `
      SELECT COUNT(*) as total 
      FROM audit_logs a 
      LEFT JOIN users u ON a.user_id = u.id 
      ${whereSql}
    `;
    const [countRows] = await db.execute(countQuery, params);
    const totalRecords = countRows[0].total;

    const dataQuery = `
      SELECT 
        a.id,
        a.action,
        a.entity_type,
        a.entity_id,
        a.ip_address,
        a.details,
        a.created_at,
        u.id AS user_id,
        u.full_name AS user_name,
        u.email AS user_email,
        u.role AS user_role
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      ${whereSql}
      ORDER BY a.created_at DESC
      LIMIT ${parseInt(limit, 10)} OFFSET ${offset}
    `;

    const [logs] = await db.execute(dataQuery, params);

    return sendSuccess(res, {
      logs,
      pagination: {
        total: totalRecords,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalPages: Math.ceil(totalRecords / parseInt(limit, 10))
      }
    }, 'Audit logs retrieved.');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAuditLogs
};
