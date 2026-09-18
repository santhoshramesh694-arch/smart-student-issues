/**
 * Audit Log Routes
 */

const express = require('express');
const router = express.Router();
const auditLogController = require('../controllers/auditLogController');
const { authenticateToken, requireRoles } = require('../middleware/authMiddleware');

router.use(authenticateToken);
router.get('/', requireRoles('admin'), auditLogController.getAuditLogs);

module.exports = router;
