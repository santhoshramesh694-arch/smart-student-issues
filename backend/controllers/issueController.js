/**
 * Issue Controller
 * Complete CRUD, Filtering, Pagination, Assignment, Status Transitions, and Image Uploads.
 */

const db = require('../config/database');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const { generateTrackingCode } = require('../utils/helpers');
const { logAction } = require('../services/auditService');
const { createNotification, notifyAdmins } = require('../services/notificationService');

// POST /api/issues (Student only)
const createIssue = async (req, res, next) => {
  const connection = await db.getConnection();
  try {
    const { title, description, category_id, location, block_area, priority } = req.body;

    if (!title || !description || !category_id || !location || !block_area) {
      return sendError(res, 'Title, description, category, location, and block area are required.', 400);
    }

    if (!req.user.student_id) {
      return sendError(res, 'Only registered students can submit issue grievances.', 403);
    }

    const trackingCode = generateTrackingCode();
    let issueImageUrl = null;
    if (req.file) {
      issueImageUrl = `/uploads/issues/${req.file.filename}`;
    }

    await connection.beginTransaction();

    const query = `
      INSERT INTO issues (
        tracking_code, student_id, category_id, title, description,
        location, block_area, priority, status, issue_image_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
    `;

    const [result] = await connection.execute(query, [
      trackingCode,
      req.user.student_id,
      category_id,
      title,
      description,
      location,
      block_area,
      priority || 'medium',
      issueImageUrl
    ]);

    const issueId = result.insertId;

    // Record Initial Timeline Update
    await connection.execute(
      `INSERT INTO issue_updates (issue_id, updated_by_user_id, previous_status, new_status, remarks)
       VALUES (?, ?, NULL, 'pending', 'Issue reported by student via campus portal')`,
      [issueId, req.user.id]
    );

    await connection.commit();

    // Async Audit and Notifications
    await logAction({
      userId: req.user.id,
      action: 'ISSUE_CREATED',
      entityType: 'ISSUE',
      entityId: issueId,
      ipAddress: req.ip,
      details: `Student created issue ${trackingCode} in ${block_area} (${priority || 'medium'})`
    });

    await notifyAdmins({
      issueId,
      title: `New Issue: ${trackingCode}`,
      message: `Student reported "${title}" in ${block_area}. Priority: ${priority || 'medium'}.`,
      type: priority === 'critical' ? 'danger' : 'info'
    });

    return sendSuccess(
      res,
      { id: issueId, tracking_code: trackingCode },
      'Campus issue reported successfully.',
      201
    );
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
};

// GET /api/issues (Role Scoped + Filterable + Paginated)
const getIssues = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      category_id,
      priority,
      status,
      block_area,
      sort_by = 'created_at',
      order = 'DESC'
    } = req.query;

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const params = [];
    let whereConditions = [];

    // Role-based data visibility scoping
    if (req.user.role === 'student') {
      whereConditions.push('i.student_id = ?');
      params.push(req.user.student_id);
    } else if (req.user.role === 'staff') {
      // If staff requests specific filtering, allow view of all or assigned
      if (req.query.assigned_only === 'false') {
        // Staff views campus directory
      } else {
        whereConditions.push('i.assigned_staff_id = ?');
        params.push(req.user.staff_id);
      }
    }

    // Dynamic Filter Clauses
    if (category_id) {
      whereConditions.push('i.category_id = ?');
      params.push(category_id);
    }
    if (priority) {
      whereConditions.push('i.priority = ?');
      params.push(priority);
    }
    if (status) {
      whereConditions.push('i.status = ?');
      params.push(status);
    }
    if (block_area) {
      whereConditions.push('i.block_area = ?');
      params.push(block_area);
    }
    if (search) {
      whereConditions.push('(i.title LIKE ? OR i.tracking_code LIKE ? OR i.location LIKE ? OR i.description LIKE ?)');
      const searchWild = `%${search}%`;
      params.push(searchWild, searchWild, searchWild, searchWild);
    }

    const whereSql = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Allowed sort columns to avoid SQL injection in ORDER BY
    const allowedSortColumns = {
      created_at: 'i.created_at',
      updated_at: 'i.updated_at',
      priority: 'FIELD(i.priority, "critical", "high", "medium", "low")',
      status: 'i.status',
      title: 'i.title'
    };
    const sortField = allowedSortColumns[sort_by] || 'i.created_at';
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Count Total Matching Records
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM issues i 
      ${whereSql}
    `;
    const [countRows] = await db.execute(countQuery, params);
    const totalRecords = countRows[0].total;

    // Fetch Paginated Results
    const dataQuery = `
      SELECT 
        i.id,
        i.tracking_code,
        i.title,
        i.description,
        i.location,
        i.block_area,
        i.priority,
        i.status,
        i.issue_image_url,
        i.resolution_image_url,
        i.created_at,
        i.updated_at,
        i.resolved_at,
        c.name AS category_name,
        c.icon AS category_icon,
        u_std.full_name AS student_name,
        u_std.email AS student_email,
        u_stf.full_name AS staff_name,
        stf.department AS staff_department,
        fb.rating AS feedback_rating
      FROM issues i
      JOIN categories c ON i.category_id = c.id
      JOIN students std ON i.student_id = std.id
      JOIN users u_std ON std.user_id = u_std.id
      LEFT JOIN staff stf ON i.assigned_staff_id = stf.id
      LEFT JOIN users u_stf ON stf.user_id = u_stf.id
      LEFT JOIN feedback fb ON fb.issue_id = i.id
      ${whereSql}
      ORDER BY ${sortField} ${sortOrder}
      LIMIT ${parseInt(limit, 10)} OFFSET ${offset}
    `;

    const [issues] = await db.execute(dataQuery, params);

    return sendSuccess(res, {
      issues,
      pagination: {
        total: totalRecords,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalPages: Math.ceil(totalRecords / parseInt(limit, 10))
      }
    }, 'Issues retrieved successfully.');
  } catch (error) {
    next(error);
  }
};

// GET /api/issues/:id (Detailed View with Timeline & Feedback)
const getIssueById = async (req, res, next) => {
  try {
    const issueId = req.params.id;

    const query = `
      SELECT 
        i.*,
        c.name AS category_name,
        c.icon AS category_icon,
        std.roll_number AS student_roll_number,
        std.department AS student_department,
        std.hostel_block AS student_hostel_block,
        std.room_number AS student_room_number,
        u_std.id AS student_user_id,
        u_std.full_name AS student_name,
        u_std.email AS student_email,
        u_std.phone AS student_phone,
        stf.employee_id AS staff_employee_id,
        stf.department AS staff_department,
        stf.designation AS staff_designation,
        stf.specialization AS staff_specialization,
        u_stf.id AS staff_user_id,
        u_stf.full_name AS staff_name,
        u_stf.email AS staff_email,
        u_stf.phone AS staff_phone
      FROM issues i
      JOIN categories c ON i.category_id = c.id
      JOIN students std ON i.student_id = std.id
      JOIN users u_std ON std.user_id = u_std.id
      LEFT JOIN staff stf ON i.assigned_staff_id = stf.id
      LEFT JOIN users u_stf ON stf.user_id = u_stf.id
      WHERE i.id = ? OR i.tracking_code = ?
    `;

    const [rows] = await db.execute(query, [issueId, issueId]);
    if (rows.length === 0) {
      return sendError(res, 'Issue not found.', 404);
    }

    const issue = rows[0];

    // Check authorization: Student can only view own issue
    if (req.user.role === 'student' && issue.student_id !== req.user.student_id) {
      return sendError(res, 'Access denied to this issue record.', 403);
    }

    // Fetch Timeline History
    const timelineQuery = `
      SELECT 
        u.id,
        u.previous_status,
        u.new_status,
        u.remarks,
        u.created_at,
        usr.full_name AS updated_by_name,
        usr.role AS updated_by_role
      FROM issue_updates u
      JOIN users usr ON u.updated_by_user_id = usr.id
      WHERE u.issue_id = ?
      ORDER BY u.created_at ASC
    `;
    const [timeline] = await db.execute(timelineQuery, [issue.id]);

    // Fetch Feedback
    const [feedbackRows] = await db.execute(
      `SELECT rating, comments, created_at FROM feedback WHERE issue_id = ?`,
      [issue.id]
    );

    return sendSuccess(res, {
      issue,
      timeline,
      feedback: feedbackRows.length > 0 ? feedbackRows[0] : null
    }, 'Issue details retrieved.');
  } catch (error) {
    next(error);
  }
};

// PUT /api/issues/:id (Edit Issue Details)
const updateIssue = async (req, res, next) => {
  try {
    const issueId = req.params.id;
    const { title, description, category_id, location, block_area, priority } = req.body;

    const [rows] = await db.execute('SELECT * FROM issues WHERE id = ?', [issueId]);
    if (rows.length === 0) {
      return sendError(res, 'Issue not found.', 404);
    }

    const issue = rows[0];

    // Authorization rule
    if (req.user.role === 'student') {
      if (issue.student_id !== req.user.student_id) {
        return sendError(res, 'Access denied.', 403);
      }
      if (issue.status !== 'pending') {
        return sendError(res, 'You can only edit issues while status is pending.', 400);
      }
    }

    await db.execute(
      `UPDATE issues SET 
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        category_id = COALESCE(?, category_id),
        location = COALESCE(?, location),
        block_area = COALESCE(?, block_area),
        priority = COALESCE(?, priority)
       WHERE id = ?`,
      [title || null, description || null, category_id || null, location || null, block_area || null, priority || null, issueId]
    );

    await logAction({
      userId: req.user.id,
      action: 'ISSUE_UPDATED',
      entityType: 'ISSUE',
      entityId: issue.id,
      ipAddress: req.ip,
      details: `Issue ${issue.tracking_code} details updated`
    });

    return sendSuccess(res, {}, 'Issue updated successfully.');
  } catch (error) {
    next(error);
  }
};

// DELETE /api/issues/:id (Admin only)
const deleteIssue = async (req, res, next) => {
  try {
    const issueId = req.params.id;
    const [rows] = await db.execute('SELECT tracking_code FROM issues WHERE id = ?', [issueId]);
    if (rows.length === 0) {
      return sendError(res, 'Issue not found.', 404);
    }

    const trackingCode = rows[0].tracking_code;

    await db.execute('DELETE FROM issues WHERE id = ?', [issueId]);

    await logAction({
      userId: req.user.id,
      action: 'ISSUE_DELETED',
      entityType: 'ISSUE',
      entityId: issueId,
      ipAddress: req.ip,
      details: `Admin deleted issue ${trackingCode}`
    });

    return sendSuccess(res, {}, `Issue ${trackingCode} deleted successfully.`);
  } catch (error) {
    next(error);
  }
};

// PUT /api/issues/:id/status (Staff & Admin)
const updateStatus = async (req, res, next) => {
  const connection = await db.getConnection();
  try {
    const issueId = req.params.id;
    const { status, remarks } = req.body;

    const validStatuses = ['pending', 'assigned', 'in_progress', 'resolved', 'closed', 'rejected'];
    if (!validStatuses.includes(status)) {
      return sendError(res, `Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400);
    }

    const [rows] = await connection.execute(
      `SELECT i.*, std.user_id as student_user_id 
       FROM issues i 
       JOIN students std ON i.student_id = std.id 
       WHERE i.id = ?`,
      [issueId]
    );

    if (rows.length === 0) {
      return sendError(res, 'Issue not found.', 404);
    }

    const issue = rows[0];

    // Staff can only update issues assigned to them
    if (req.user.role === 'staff' && issue.assigned_staff_id !== req.user.staff_id) {
      return sendError(res, 'You can only update status for issues assigned to you.', 403);
    }

    await connection.beginTransaction();

    let resolvedAt = issue.resolved_at;
    let closedAt = issue.closed_at;

    if (status === 'resolved' && !resolvedAt) {
      resolvedAt = new Date();
    }
    if (status === 'closed' && !closedAt) {
      closedAt = new Date();
    }

    await connection.execute(
      `UPDATE issues SET status = ?, resolved_at = ?, closed_at = ? WHERE id = ?`,
      [status, resolvedAt, closedAt, issueId]
    );

    await connection.execute(
      `INSERT INTO issue_updates (issue_id, updated_by_user_id, previous_status, new_status, remarks)
       VALUES (?, ?, ?, ?, ?)`,
      [issueId, req.user.id, issue.status, status, remarks || `Status changed from ${issue.status} to ${status}`]
    );

    await connection.commit();

    // Notifications and Audit
    await createNotification({
      userId: issue.student_user_id,
      issueId: issue.id,
      title: `Issue ${issue.tracking_code} Updated`,
      message: `Your reported issue status has been updated to "${status}". Remarks: ${remarks || 'None'}`,
      type: status === 'resolved' ? 'success' : 'info'
    });

    await logAction({
      userId: req.user.id,
      action: 'STATUS_CHANGED',
      entityType: 'ISSUE',
      entityId: issue.id,
      ipAddress: req.ip,
      details: `Status of ${issue.tracking_code} changed from ${issue.status} to ${status}`
    });

    return sendSuccess(res, { status }, `Issue status updated to ${status}.`);
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
};

// PUT /api/issues/:id/assign (Admin only)
const assignStaff = async (req, res, next) => {
  const connection = await db.getConnection();
  try {
    const issueId = req.params.id;
    const { staff_id } = req.body;

    if (!staff_id) {
      return sendError(res, 'staff_id is required.', 400);
    }

    // Verify staff exists
    const [staffRows] = await connection.execute(
      `SELECT s.id, s.department, u.id as user_id, u.full_name, u.email 
       FROM staff s 
       JOIN users u ON s.user_id = u.id 
       WHERE s.id = ?`,
      [staff_id]
    );

    if (staffRows.length === 0) {
      return sendError(res, 'Selected staff member not found.', 404);
    }

    const assignedStaff = staffRows[0];

    const [issueRows] = await connection.execute(
      `SELECT i.*, std.user_id as student_user_id 
       FROM issues i 
       JOIN students std ON i.student_id = std.id 
       WHERE i.id = ?`,
      [issueId]
    );

    if (issueRows.length === 0) {
      return sendError(res, 'Issue not found.', 404);
    }

    const issue = issueRows[0];
    const newStatus = issue.status === 'pending' ? 'assigned' : issue.status;

    await connection.beginTransaction();

    await connection.execute(
      `UPDATE issues SET assigned_staff_id = ?, status = ? WHERE id = ?`,
      [staff_id, newStatus, issueId]
    );

    await connection.execute(
      `INSERT INTO issue_updates (issue_id, updated_by_user_id, previous_status, new_status, remarks)
       VALUES (?, ?, ?, ?, ?)`,
      [issueId, req.user.id, issue.status, newStatus, `Assigned to ${assignedStaff.full_name} (${assignedStaff.department})`]
    );

    await connection.commit();

    // Notify assigned staff
    await createNotification({
      userId: assignedStaff.user_id,
      issueId: issue.id,
      title: `New Assignment: ${issue.tracking_code}`,
      message: `You have been assigned to resolve "${issue.title}" located at ${issue.location}. Priority: ${issue.priority}.`,
      type: issue.priority === 'critical' ? 'danger' : 'info'
    });

    // Notify reporting student
    await createNotification({
      userId: issue.student_user_id,
      issueId: issue.id,
      title: `Staff Assigned to Your Issue`,
      message: `Engineer ${assignedStaff.full_name} has been assigned to your issue ${issue.tracking_code}.`,
      type: 'info'
    });

    await logAction({
      userId: req.user.id,
      action: 'ISSUE_ASSIGNED',
      entityType: 'ISSUE',
      entityId: issue.id,
      ipAddress: req.ip,
      details: `Admin assigned ${assignedStaff.full_name} to issue ${issue.tracking_code}`
    });

    return sendSuccess(res, { assigned_staff: assignedStaff.full_name }, 'Staff successfully assigned to issue.');
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
};

// POST /api/issues/:id/resolve (Staff resolution with notes & photo proof)
const resolveIssue = async (req, res, next) => {
  const connection = await db.getConnection();
  try {
    const issueId = req.params.id;
    const { resolution_notes } = req.body;

    if (!resolution_notes) {
      return sendError(res, 'Resolution notes detailing root cause and fix are required.', 400);
    }

    const [rows] = await connection.execute(
      `SELECT i.*, std.user_id as student_user_id 
       FROM issues i 
       JOIN students std ON i.student_id = std.id 
       WHERE i.id = ?`,
      [issueId]
    );

    if (rows.length === 0) {
      return sendError(res, 'Issue not found.', 404);
    }

    const issue = rows[0];

    if (req.user.role === 'staff' && issue.assigned_staff_id !== req.user.staff_id) {
      return sendError(res, 'You can only resolve issues assigned to you.', 403);
    }

    let resolutionImageUrl = issue.resolution_image_url;
    if (req.file) {
      resolutionImageUrl = `/uploads/resolutions/${req.file.filename}`;
    }

    await connection.beginTransaction();

    await connection.execute(
      `UPDATE issues SET 
        status = 'resolved',
        resolution_notes = ?,
        resolution_image_url = ?,
        resolved_at = NOW()
       WHERE id = ?`,
      [resolution_notes, resolutionImageUrl, issueId]
    );

    await connection.execute(
      `INSERT INTO issue_updates (issue_id, updated_by_user_id, previous_status, new_status, remarks)
       VALUES (?, ?, ?, 'resolved', ?)`,
      [issueId, req.user.id, issue.status, `Resolution completed: ${resolution_notes}`]
    );

    await connection.commit();

    // Notify Student to review and provide rating feedback
    await createNotification({
      userId: issue.student_user_id,
      issueId: issue.id,
      title: `Issue ${issue.tracking_code} Resolved!`,
      message: `Your issue has been marked resolved. Please review the resolution and submit your feedback.`,
      type: 'success'
    });

    await logAction({
      userId: req.user.id,
      action: 'ISSUE_RESOLVED',
      entityType: 'ISSUE',
      entityId: issue.id,
      ipAddress: req.ip,
      details: `Staff resolved ${issue.tracking_code} with notes: ${resolution_notes}`
    });

    return sendSuccess(res, {}, 'Issue marked as resolved.');
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
};

module.exports = {
  createIssue,
  getIssues,
  getIssueById,
  updateIssue,
  deleteIssue,
  updateStatus,
  assignStaff,
  resolveIssue
};
