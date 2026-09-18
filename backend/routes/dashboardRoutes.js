/**
 * Dashboard and Analytics Routes
 */

const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticateToken, requireRoles } = require('../middleware/authMiddleware');

router.use(authenticateToken);

// Role-specific Dashboards
router.get('/admin', requireRoles('admin'), dashboardController.getAdminDashboard);
router.get('/student', requireRoles('student', 'admin'), dashboardController.getStudentDashboard);
router.get('/staff', requireRoles('staff', 'admin'), dashboardController.getStaffDashboard);

// Campus Problem Analytics Engine
router.get('/campus-analytics', requireRoles('admin', 'staff'), dashboardController.getCampusProblemAnalytics);

module.exports = router;
