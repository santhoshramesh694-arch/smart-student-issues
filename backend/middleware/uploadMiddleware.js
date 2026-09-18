/**
 * Multer File Upload Middleware
 * Handles disk storage, MIME validation, and size constraints.
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const uploadDirs = [
  path.join(__dirname, '..', 'uploads', 'issues'),
  path.join(__dirname, '..', 'uploads', 'resolutions'),
  path.join(__dirname, '..', 'uploads', 'avatars')
];

uploadDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure storage with sanitized filenames
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let dest = path.join(__dirname, '..', 'uploads', 'issues');
    if (req.originalUrl && req.originalUrl.includes('resolve')) {
      dest = path.join(__dirname, '..', 'uploads', 'resolutions');
    } else if (req.originalUrl && req.originalUrl.includes('avatar')) {
      dest = path.join(__dirname, '..', 'uploads', 'avatars');
    }
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeBaseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30);
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${safeBaseName}-${uniqueSuffix}${ext}`);
  }
});

// MIME Type Whitelist filter
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, and WebP image files are allowed.'));
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB maximum file size
  },
  fileFilter
});

module.exports = upload;
