/**
 * Feedback Controller
 * Allows students to review and rate resolved issues.
 */

const db = require('../config/database');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const { logAction } = require('../services/auditService');

// POST /api/feedback (Student submits feedback)
const submitFeedback = async (req, res, next) => {
  try {
    const { issue_id, rating, comments } = req.body;
    const studentId = req.user.student_id;

    if (!issue_id || !rating) {
      return sendError(res, 'issue_id and rating (1-5) are required.', 400);
    }

    const numericRating = parseInt(rating, 10);
    if (numericRating < 1 || numericRating > 5) {
      return sendError(res, 'Rating must be an integer between 1 and 5.', 400);
    }

    // Verify issue belongs to this student and is resolved or closed
    const [issues] = await db.execute(
      'SELECT id, student_id, status, tracking_code FROM issues WHERE id = ?',
      [issue_id]
    );

    if (issues.length === 0) {
      return sendError(res, 'Issue not found.', 404);
    }

    const issue = issues[0];

    if (issue.student_id !== studentId && req.user.role !== 'admin') {
      return sendError(res, 'You can only submit feedback for your own issues.', 403);
    }

    if (issue.status !== 'resolved' && issue.status !== 'closed') {
      return sendError(res, 'Feedback can only be submitted for resolved or closed issues.', 400);
    }

    // Check if feedback already submitted
    const [existing] = await db.execute('SELECT id FROM feedback WHERE issue_id = ?', [issue_id]);
    if (existing.length > 0) {
      // Update existing feedback
      await db.execute(
        'UPDATE feedback SET rating = ?, comments = ? WHERE issue_id = ?',
        [numericRating, comments || null, issue_id]
      );
    } else {
      // Insert new feedback
      await db.execute(
        'INSERT INTO feedback (issue_id, student_id, rating, comments) VALUES (?, ?, ?, ?)',
        [issue_id, studentId, numericRating, comments || null]
      );
    }

    await logAction({
      userId: req.user.id,
      action: 'FEEDBACK_SUBMITTED',
      entityType: 'FEEDBACK',
      entityId: issue_id,
      ipAddress: req.ip,
      details: `Student rated issue ${issue.tracking_code} as ${numericRating} stars`
    });

    return sendSuccess(res, {}, 'Thank you! Your feedback has been recorded.');
  } catch (error) {
    next(error);
  }
};

// GET /api/feedback/summary (Admin view)
const getFeedbackSummary = async (req, res, next) => {
  try {
    const [stats] = await db.execute(`
      SELECT 
        COUNT(*) as total_feedback,
        ROUND(AVG(rating), 2) as average_rating,
        COUNT(CASE WHEN rating = 5 THEN 1 END) as star_5,
        COUNT(CASE WHEN rating = 4 THEN 1 END) as star_4,
        COUNT(CASE WHEN rating = 3 THEN 1 END) as star_3,
        COUNT(CASE WHEN rating = 2 THEN 1 END) as star_2,
        COUNT(CASE WHEN rating = 1 THEN 1 END) as star_1
      FROM feedback
    `);

    const [recent] = await db.execute(`
      SELECT 
        fb.id, fb.rating, fb.comments, fb.created_at,
        i.tracking_code, i.title as issue_title,
        c.name as category_name,
        u_std.full_name as student_name,
        u_stf.full_name as staff_name
      FROM feedback fb
      JOIN issues i ON fb.issue_id = i.id
      JOIN categories c ON i.category_id = c.id
      JOIN students std ON fb.student_id = std.id
      JOIN users u_std ON std.user_id = u_std.id
      LEFT JOIN staff stf ON i.assigned_staff_id = stf.id
      LEFT JOIN users u_stf ON stf.user_id = u_stf.id
      ORDER BY fb.created_at DESC
      LIMIT 20
    `);

    return sendSuccess(res, {
      summary: stats[0],
      recent_feedback: recent
    }, 'Feedback analytics retrieved.');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  submitFeedback,
  getFeedbackSummary
};
