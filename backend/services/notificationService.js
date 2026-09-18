/**
 * Notification Service
 * Dispatches notifications to users and administrators upon key issue events.
 */

const db = require('../config/database');

/**
 * Send notification to a specific user
 */
const createNotification = async ({ userId, issueId = null, title, message, type = 'info' }) => {
  try {
    const query = `
      INSERT INTO notifications (user_id, issue_id, title, message, type, is_read)
      VALUES (?, ?, ?, ?, ?, 0)
    `;
    const [result] = await db.execute(query, [userId, issueId, title, message, type]);
    return result.insertId;
  } catch (error) {
    console.error('[NotificationService Error]: Failed to create notification:', error.message);
    return null;
  }
};

/**
 * Broadcast notification to all active administrators
 */
const notifyAdmins = async ({ issueId = null, title, message, type = 'info' }) => {
  try {
    const [admins] = await db.execute('SELECT id FROM users WHERE role = "admin" AND is_active = 1');
    for (const admin of admins) {
      await createNotification({ userId: admin.id, issueId, title, message, type });
    }
  } catch (error) {
    console.error('[NotificationService Error]: Failed to notify admins:', error.message);
  }
};

module.exports = {
  createNotification,
  notifyAdmins
};
