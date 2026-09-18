/**
 * Audit Log Service
 * Records administrative and operational activities into the audit_logs table.
 */

const db = require('../config/database');

const logAction = async ({ userId = null, action, entityType, entityId = null, ipAddress = null, details = null }) => {
  try {
    const query = `
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address, details)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    await db.execute(query, [
      userId,
      action,
      entityType,
      entityId,
      ipAddress,
      typeof details === 'object' ? JSON.stringify(details) : details
    ]);
  } catch (error) {
    console.error('[AuditService Error]: Failed to write audit log:', error.message);
  }
};

module.exports = {
  logAction
};
