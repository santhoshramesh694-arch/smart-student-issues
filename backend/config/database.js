/**
 * MySQL Database Connection Pool
 * Uses mysql2/promise for async/await execution with connection pooling.
 */

const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'smart_campus_db',
  waitForConnections: true,
  connectionLimit: 15,
  queueLimit: 0,
  charset: 'utf8mb4'
});

// Test connection on startup
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log(`[Database] Successfully connected to MySQL database "${process.env.DB_NAME || 'smart_campus_db'}"`);
    connection.release();
  } catch (error) {
    console.error('[Database] MySQL Connection Failed:', error.message);
  }
})();

module.exports = pool;
