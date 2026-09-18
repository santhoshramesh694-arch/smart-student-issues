/**
 * User Management Routes
 */

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken, requireRoles } = require('../middleware/authMiddleware');

router.use(authenticateToken);

// Accessible by Staff and Admin for assignment listings
router.get('/staff/list', requireRoles('admin', 'staff'), userController.getStaffList);

// Admin-only management routes
router.get('/', requireRoles('admin'), userController.getUsers);
router.post('/', requireRoles('admin'), userController.createUser);
router.get('/:id', requireRoles('admin'), userController.getUserById);
router.put('/:id', requireRoles('admin'), userController.updateUser);
router.delete('/:id', requireRoles('admin'), userController.deleteUser);

module.exports = router;
