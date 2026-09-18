/**
 * Smart Campus Issue & Resource Management System
 * Core Express Application Server
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Import Database Pool to ensure early initialization
require('./config/database');

// Import Middlewares
const errorHandler = require('./middleware/errorHandler');

// Import API Routes
const authRoutes = require('./routes/authRoutes');
const issueRoutes = require('./routes/issueRoutes');
const userRoutes = require('./routes/userRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const auditLogRoutes = require('./routes/auditLogRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Security & Parsing Middlewares
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static Assets Hosting
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// API Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Smart Campus API Server',
    version: '1.0.0'
  });
});

// Mount API Routers
app.use('/api/auth', authRoutes);
app.use('/api/issues', issueRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/audit-logs', auditLogRoutes);

// Centralized Error Handling Middleware
app.use(errorHandler);

// SPA / Direct HTML fallback for clean page navigation
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
    return res.status(404).json({ success: false, message: 'API Route Not Found' });
  }
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// Start Server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log('====================================================');
    console.log(`  Smart Campus Server running on port ${PORT}`);
    console.log(`  Local URL:   http://localhost:${PORT}`);
    console.log(`  API Health:  http://localhost:${PORT}/api/health`);
    console.log('====================================================');
  });
}

module.exports = app;
