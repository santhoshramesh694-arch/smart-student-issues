/**
 * Dashboard and Campus Problem Analytics Controller
 * Calculates real-time statistics, chart aggregations, and hotspot intelligence.
 */

const db = require('../config/database');
const { sendSuccess, sendError } = require('../utils/responseHandler');

// GET /api/dashboard/admin
const getAdminDashboard = async (req, res, next) => {
  try {
    // 1. KPI Metric Cards
    const [userCount] = await db.execute('SELECT COUNT(*) as total FROM users WHERE is_active = 1');
    const [issueStats] = await db.execute(`
      SELECT 
        COUNT(*) as total_issues,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_issues,
        COUNT(CASE WHEN status = 'assigned' THEN 1 END) as assigned_issues,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_issues,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_issues,
        COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed_issues,
        COUNT(CASE WHEN priority = 'critical' AND status NOT IN ('resolved', 'closed') THEN 1 END) as critical_issues
      FROM issues
    `);

    // 2. Chart 1: Issues by Category
    const [categoryChart] = await db.execute(`
      SELECT c.name, COUNT(i.id) as count
      FROM categories c
      LEFT JOIN issues i ON i.category_id = c.id
      GROUP BY c.id, c.name
      ORDER BY count DESC
    `);

    // 3. Chart 2: Issues by Status
    const [statusChart] = await db.execute(`
      SELECT status, COUNT(*) as count
      FROM issues
      GROUP BY status
    `);

    // 4. Chart 3: Monthly Issue Trends (Last 6 Months)
    const [trendChart] = await db.execute(`
      SELECT 
        DATE_FORMAT(created_at, '%b %Y') as month,
        COUNT(*) as total_reported,
        COUNT(CASE WHEN status IN ('resolved', 'closed') THEN 1 END) as total_resolved
      FROM issues
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(created_at, '%b %Y'), YEAR(created_at), MONTH(created_at)
      ORDER BY YEAR(created_at) ASC, MONTH(created_at) ASC
    `);

    // 5. Chart 4: Staff Resolution Performance
    const [staffPerformance] = await db.execute(`
      SELECT 
        u.full_name as staff_name,
        stf.department,
        COUNT(i.id) as assigned_count,
        COUNT(CASE WHEN i.status IN ('resolved', 'closed') THEN 1 END) as resolved_count,
        COUNT(CASE WHEN i.status IN ('assigned', 'in_progress') THEN 1 END) as pending_count
      FROM staff stf
      JOIN users u ON stf.user_id = u.id
      LEFT JOIN issues i ON i.assigned_staff_id = stf.id
      WHERE u.is_active = 1
      GROUP BY stf.id, u.full_name, stf.department
      ORDER BY resolved_count DESC
    `);

    // 6. Campus Problem Analytics Hotspots
    const [campusHotspots] = await db.execute(`
      SELECT 
        block_area,
        c.name as top_category,
        COUNT(i.id) as issue_count,
        COUNT(CASE WHEN i.priority IN ('high', 'critical') THEN 1 END) as high_severity_count,
        COUNT(CASE WHEN i.status NOT IN ('resolved', 'closed') THEN 1 END) as unresolved_count
      FROM issues i
      JOIN categories c ON i.category_id = c.id
      GROUP BY block_area, c.name
      ORDER BY issue_count DESC
      LIMIT 8
    `);

    // 7. Recent Issues (Latest 6)
    const [recentIssues] = await db.execute(`
      SELECT 
        i.id, i.tracking_code, i.title, i.priority, i.status, i.block_area, i.created_at,
        c.name as category_name, c.icon as category_icon,
        u_std.full_name as student_name
      FROM issues i
      JOIN categories c ON i.category_id = c.id
      JOIN students std ON i.student_id = std.id
      JOIN users u_std ON std.user_id = u_std.id
      ORDER BY i.created_at DESC
      LIMIT 6
    `);

    return sendSuccess(res, {
      kpi: {
        total_users: userCount[0].total,
        total_issues: issueStats[0].total_issues,
        pending_issues: issueStats[0].pending_issues,
        in_progress_issues: issueStats[0].in_progress_issues,
        resolved_issues: issueStats[0].resolved_issues,
        critical_issues: issueStats[0].critical_issues,
        closed_issues: issueStats[0].closed_issues
      },
      charts: {
        by_category: categoryChart,
        by_status: statusChart,
        monthly_trends: trendChart,
        staff_performance: staffPerformance
      },
      campus_hotspots: campusHotspots,
      recent_issues: recentIssues
    }, 'Admin dashboard metrics retrieved.');
  } catch (error) {
    next(error);
  }
};

// GET /api/dashboard/student
const getStudentDashboard = async (req, res, next) => {
  try {
    const studentId = req.user.student_id;
    if (!studentId) {
      return sendError(res, 'Student profile not found.', 404);
    }

    // Counts
    const [stats] = await db.execute(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'assigned' THEN 1 END) as assigned,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved,
        COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed
      FROM issues 
      WHERE student_id = ?
    `, [studentId]);

    // Recent 5 Issues
    const [recentIssues] = await db.execute(`
      SELECT 
        i.id, i.tracking_code, i.title, i.location, i.block_area, i.priority, i.status, i.created_at,
        c.name as category_name, c.icon as category_icon,
        fb.rating as feedback_rating
      FROM issues i
      JOIN categories c ON i.category_id = c.id
      LEFT JOIN feedback fb ON fb.issue_id = i.id
      WHERE i.student_id = ?
      ORDER BY i.created_at DESC
      LIMIT 5
    `, [studentId]);

    // Unread Notifications Count
    const [unreadNotifs] = await db.execute(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
      [req.user.id]
    );

    return sendSuccess(res, {
      kpi: stats[0],
      recent_issues: recentIssues,
      unread_notifications: unreadNotifs[0].count
    }, 'Student dashboard loaded.');
  } catch (error) {
    next(error);
  }
};

// GET /api/dashboard/staff
const getStaffDashboard = async (req, res, next) => {
  try {
    const staffId = req.user.staff_id;
    if (!staffId) {
      return sendError(res, 'Staff profile not found.', 404);
    }

    // Workload stats
    const [stats] = await db.execute(`
      SELECT 
        COUNT(*) as total_assigned,
        COUNT(CASE WHEN status = 'assigned' THEN 1 END) as pending_pickup,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved,
        COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed,
        COUNT(CASE WHEN priority = 'critical' AND status IN ('assigned', 'in_progress') THEN 1 END) as critical_pending
      FROM issues 
      WHERE assigned_staff_id = ?
    `, [staffId]);

    // Recent 6 Assigned Tasks
    const [recentTasks] = await db.execute(`
      SELECT 
        i.id, i.tracking_code, i.title, i.location, i.block_area, i.priority, i.status, i.created_at,
        c.name as category_name, c.icon as category_icon,
        u_std.full_name as student_name,
        u_std.phone as student_phone
      FROM issues i
      JOIN categories c ON i.category_id = c.id
      JOIN students std ON i.student_id = std.id
      JOIN users u_std ON std.user_id = u_std.id
      WHERE i.assigned_staff_id = ?
      ORDER BY FIELD(i.priority, 'critical', 'high', 'medium', 'low'), i.created_at DESC
      LIMIT 6
    `, [staffId]);

    return sendSuccess(res, {
      kpi: stats[0],
      recent_tasks: recentTasks
    }, 'Staff dashboard loaded.');
  } catch (error) {
    next(error);
  }
};

// GET /api/dashboard/campus-analytics (In-depth Analytics)
const getCampusProblemAnalytics = async (req, res, next) => {
  try {
    // 1. Hotspots by Location / Block Area
    const [blockDistribution] = await db.execute(`
      SELECT 
        block_area,
        COUNT(*) as total_issues,
        COUNT(CASE WHEN status IN ('resolved', 'closed') THEN 1 END) as resolved_issues,
        COUNT(CASE WHEN status NOT IN ('resolved', 'closed') THEN 1 END) as active_issues,
        ROUND(AVG(CASE WHEN resolved_at IS NOT NULL THEN TIMESTAMPDIFF(HOUR, created_at, resolved_at) END), 1) as avg_resolution_hours
      FROM issues
      GROUP BY block_area
      ORDER BY total_issues DESC
    `);

    // 2. High Frequency Issue Matrix (Block + Category Co-occurrence)
    const [matrix] = await db.execute(`
      SELECT 
        i.block_area,
        c.name as category_name,
        COUNT(*) as frequency,
        ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM issues WHERE block_area = i.block_area)), 1) as percentage_of_block
      FROM issues i
      JOIN categories c ON i.category_id = c.id
      GROUP BY i.block_area, c.name
      HAVING frequency >= 1
      ORDER BY i.block_area ASC, frequency DESC
    `);

    // 3. Priority Severity Breakdown
    const [priorityBreakdown] = await db.execute(`
      SELECT priority, COUNT(*) as count
      FROM issues
      GROUP BY priority
      ORDER BY FIELD(priority, 'critical', 'high', 'medium', 'low')
    `);

    return sendSuccess(res, {
      block_distribution: blockDistribution,
      problem_matrix: matrix,
      priority_breakdown: priorityBreakdown
    }, 'Campus Problem Analytics generated.');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAdminDashboard,
  getStudentDashboard,
  getStaffDashboard,
  getCampusProblemAnalytics
};
