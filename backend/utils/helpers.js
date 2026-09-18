/**
 * Utility functions for ID generation, formatting, and validation.
 */

const crypto = require('crypto');

/**
 * Generate a unique tracking code for an issue (e.g. ISS-2026-A8F2)
 */
const generateTrackingCode = () => {
  const year = new Date().getFullYear();
  const randomHex = crypto.randomBytes(2).toString('hex').toUpperCase();
  const timestampPart = Date.now().toString().slice(-4);
  return `ISS-${year}-${randomHex}${timestampPart}`;
};

/**
 * Sanitize text input to protect against basic XSS
 */
const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  return str
    .trim()
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
};

module.exports = {
  generateTrackingCode,
  sanitizeString
};
