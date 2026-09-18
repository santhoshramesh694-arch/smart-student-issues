/**
 * Notification Controller
 */

const db = require('../config/database');
const { sendSuccess, sendError } = require('../utils/responseHandler');

// GET /api/notifications
const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const [notifications] = await db.execute(
      `SELECT n.*, i.tracking_code 
       FROM notifications n 
       LEFT JOIN issues i ON n.issue_id = i.id 
       WHERE n.user_id = ? 
       ORDER BY n.created_at DESC 
       LIMIT 40`,
      [userId]
    );

    const [unread] = await db.execute(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
      [userId]
    );

    return sendSuccess(res, {
      notifications,
      unread_count: unread[0].count
    }, 'Notifications retrieved.');
  } catch (error) {
    next(error);
  }
};

// PUT /api/notifications/:id/read
const markAsRead = async (req, res, next) => {
  try {
    const notificationId = req.params.id;
    const userId = req.user.id;

    await db.execute(
      'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
      [notificationId, userId]
    );

    return sendSuccess(res, {}, 'Notification marked as read.');
  } catch (error) {
    next(error);
  }
};

// PUT /api/notifications/read-all
const markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user.id;
    await db.execute('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [userId]);
    return sendSuccess(res, {}, 'All notifications marked as read.');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead
};
