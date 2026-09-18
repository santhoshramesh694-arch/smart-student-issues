/**
 * Feedback Routes
 */

const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');
const { authenticateToken, requireRoles } = require('../middleware/authMiddleware');

router.use(authenticateToken);

router.post('/', requireRoles('student', 'admin'), feedbackController.submitFeedback);
router.get('/summary', requireRoles('admin'), feedbackController.getFeedbackSummary);

module.exports = router;
