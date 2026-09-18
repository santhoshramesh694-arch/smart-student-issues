/**
 * Category Controller
 * Handles CRUD operations for campus issue categories.
 */

const db = require('../config/database');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const { logAction } = require('../services/auditService');

// GET /api/categories
const getCategories = async (req, res, next) => {
  try {
    const includeInactive = req.query.all === 'true' && req.user && req.user.role === 'admin';
    const query = includeInactive
      ? 'SELECT * FROM categories ORDER BY name ASC'
      : 'SELECT * FROM categories WHERE is_active = 1 ORDER BY name ASC';

    const [categories] = await db.execute(query);
    return sendSuccess(res, { categories }, 'Categories retrieved.');
  } catch (error) {
    next(error);
  }
};

// POST /api/categories (Admin only)
const createCategory = async (req, res, next) => {
  try {
    const { name, description, icon } = req.body;

    if (!name) {
      return sendError(res, 'Category name is required.', 400);
    }

    const [result] = await db.execute(
      `INSERT INTO categories (name, description, icon, is_active) VALUES (?, ?, ?, 1)`,
      [name, description || null, icon || 'fa-wrench']
    );

    await logAction({
      userId: req.user.id,
      action: 'CATEGORY_CREATED',
      entityType: 'CATEGORY',
      entityId: result.insertId,
      ipAddress: req.ip,
      details: `Created category "${name}"`
    });

    return sendSuccess(res, { id: result.insertId, name }, 'Category created successfully.', 201);
  } catch (error) {
    next(error);
  }
};

// PUT /api/categories/:id (Admin only)
const updateCategory = async (req, res, next) => {
  try {
    const categoryId = req.params.id;
    const { name, description, icon, is_active } = req.body;

    const [result] = await db.execute(
      `UPDATE categories SET 
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        icon = COALESCE(?, icon),
        is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [name || null, description || null, icon || null, is_active !== undefined ? is_active : null, categoryId]
    );

    if (result.affectedRows === 0) {
      return sendError(res, 'Category not found.', 404);
    }

    await logAction({
      userId: req.user.id,
      action: 'CATEGORY_UPDATED',
      entityType: 'CATEGORY',
      entityId: categoryId,
      ipAddress: req.ip,
      details: `Updated category ID ${categoryId}`
    });

    return sendSuccess(res, {}, 'Category updated successfully.');
  } catch (error) {
    next(error);
  }
};

// DELETE /api/categories/:id (Admin only)
const deleteCategory = async (req, res, next) => {
  try {
    const categoryId = req.params.id;

    // Check if issues reference this category
    const [issues] = await db.execute('SELECT id FROM issues WHERE category_id = ? LIMIT 1', [categoryId]);
    if (issues.length > 0) {
      // Deactivate instead of hard delete to preserve referential integrity
      await db.execute('UPDATE categories SET is_active = 0 WHERE id = ?', [categoryId]);
      return sendSuccess(res, {}, 'Category is referenced by existing issues. Deactivated instead of deleted.');
    }

    await db.execute('DELETE FROM categories WHERE id = ?', [categoryId]);

    await logAction({
      userId: req.user.id,
      action: 'CATEGORY_DELETED',
      entityType: 'CATEGORY',
      entityId: categoryId,
      ipAddress: req.ip,
      details: `Deleted category ID ${categoryId}`
    });

    return sendSuccess(res, {}, 'Category deleted successfully.');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory
};
