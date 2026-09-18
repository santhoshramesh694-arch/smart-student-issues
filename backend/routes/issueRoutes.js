/**
 * Issue Routes
 */

const express = require('express');
const router = express.Router();
const issueController = require('../controllers/issueController');
const { authenticateToken, requireRoles } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// All issue routes require authentication
router.use(authenticateToken);

// Create issue (Student)
router.post('/', requireRoles('student', 'admin'), upload.single('image'), issueController.createIssue);

// Get list of issues (Scoped by role + filterable)
router.get('/', issueController.getIssues);

// Get single issue details
router.get('/:id', issueController.getIssueById);

// Update issue content
router.put('/:id', requireRoles('student', 'admin'), issueController.updateIssue);

// Delete issue (Admin only)
router.delete('/:id', requireRoles('admin'), issueController.deleteIssue);

// Update issue status
router.put('/:id/status', requireRoles('staff', 'admin'), issueController.updateStatus);

// Assign staff to issue (Admin only)
router.put('/:id/assign', requireRoles('admin'), issueController.assignStaff);

// Mark resolved with notes and photo (Staff only)
router.post('/:id/resolve', requireRoles('staff', 'admin'), upload.single('resolution_image'), issueController.resolveIssue);

module.exports = router;
