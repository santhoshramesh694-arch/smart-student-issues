/**
 * Category Routes
 */

const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { authenticateToken, requireRoles } = require('../middleware/authMiddleware');

// Public listing
router.get('/', categoryController.getCategories);

// Admin-only management
router.post('/', authenticateToken, requireRoles('admin'), categoryController.createCategory);
router.put('/:id', authenticateToken, requireRoles('admin'), categoryController.updateCategory);
router.delete('/:id', authenticateToken, requireRoles('admin'), categoryController.deleteCategory);

module.exports = router;
