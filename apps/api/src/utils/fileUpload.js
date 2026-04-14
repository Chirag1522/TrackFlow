const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { sanitize } = require('./validators');

/**
 * Secure file upload handler with validation and security checks
 * Supports multiple file types and implements safe storage
 */

const uploadsDir = path.join(__dirname, '../../uploads');

// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

/**
 * Allowed file types by category
 */
const ALLOWED_FILES = {
  // Proof of delivery documents
  proofOfDelivery: {
    types: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    mimeTypes: ['.jpg', '.jpeg', '.png', '.webp', '.pdf'],
    maxSize: 10 * 1024 * 1024, // 10MB
    description: 'Proof of Delivery (images or PDF)',
  },

  // Supporting documents
  documents: {
    types: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    mimeTypes: ['.pdf', '.doc', '.docx'],
    maxSize: 25 * 1024 * 1024, // 25MB
    description: 'Documents (PDF, DOC, DOCX)',
  },

  // Images only
  images: {
    types: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    mimeTypes: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
    maxSize: 5 * 1024 * 1024, // 5MB
    description: 'Images (JPEG, PNG, WebP, GIF)',
  },

  // CSV for bulk imports
  csv: {
    types: ['text/csv', 'application/vnd.ms-excel'],
    mimeTypes: ['.csv', '.xlsx'],
    maxSize: 50 * 1024 * 1024, // 50MB
    description: 'CSV/Excel files',
  },
};

/**
 * Generate secure file name
 * Prevents directory traversal and path injection attacks
 */
const generateSecureFilename = (originalName, fileType) => {
  const sanitized = sanitize.filename(originalName);
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString('hex');
  const ext = path.extname(sanitized);
  return `${fileType}-${timestamp}-${random}${ext}`;
};

/**
 * Multer storage configuration
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Store files in subfolder by upload type
    const uploadType = req.uploadType || 'general';
    const typeDir = path.join(uploadsDir, uploadType);

    if (!fs.existsSync(typeDir)) {
      fs.mkdirSync(typeDir, { recursive: true });
    }

    cb(null, typeDir);
  },

  filename: (req, file, cb) => {
    const uploadType = req.uploadType || 'general';
    const secure = generateSecureFilename(file.originalname, uploadType);
    cb(null, secure);
  },
});

/**
 * File filter for validation
 */
const fileFilter = (allowedTypes) => (req, file, cb) => {
  const config = ALLOWED_FILES[allowedTypes];

  if (!config) {
    return cb(new Error(`Unknown file type category: ${allowedTypes}`));
  }

  // Check MIME type
  if (!config.types.includes(file.mimetype)) {
    return cb(
      new Error(
        `Invalid file type. Allowed types: ${config.mimeTypes.join(', ')}. Got: ${file.mimetype}`
      )
    );
  }

  // Check file extension
  const ext = path.extname(file.originalname).toLowerCase();
  if (!config.mimeTypes.includes(ext)) {
    return cb(
      new Error(
        `Invalid file extension. Allowed: ${config.mimeTypes.join(', ')}. Got: ${ext}`
      )
    );
  }

  // Check file name is safe
  if (!sanitize.filename(file.originalname)) {
    return cb(new Error('Invalid filename'));
  }

  cb(null, true);
};

/**
 * Create multer uploader for specific file type
 */
const createUploader = (fileType = 'proofOfDelivery') => {
  const config = ALLOWED_FILES[fileType];

  if (!config) {
    throw new Error(`Unknown file type: ${fileType}`);
  }

  return multer({
    storage,
    fileFilter: fileFilter(fileType),
    limits: {
      fileSize: config.maxSize,
      files: 5, // Max 5 files per upload
    },
  });
};

/**
 * Specific uploaders for common scenarios
 */
const uploaders = {
  // Proof of delivery (single file)
  proofOfDelivery: multer({
    storage,
    fileFilter: fileFilter('proofOfDelivery'),
    limits: {
      fileSize: ALLOWED_FILES.proofOfDelivery.maxSize,
      files: 1,
    },
  }),

  // Multiple documents
  documents: multer({
    storage,
    fileFilter: fileFilter('documents'),
    limits: {
      fileSize: ALLOWED_FILES.documents.maxSize,
      files: 5,
    },
  }),

  // Images
  images: multer({
    storage,
    fileFilter: fileFilter('images'),
    limits: {
      fileSize: ALLOWED_FILES.images.maxSize,
      files: 10,
    },
  }),

  // CSV imports
  csv: multer({
    storage,
    fileFilter: fileFilter('csv'),
    limits: {
      fileSize: ALLOWED_FILES.csv.maxSize,
      files: 1,
    },
  }),
};

/**
 * Middleware to handle multer errors
 */
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'FILE_TOO_LARGE') {
      return res.status(400).json({
        error: 'File too large',
        details: `Maximum file size is ${err.limit} bytes`,
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        error: 'Too many files',
        details: 'Maximum 5 files allowed',
      });
    }
    return res.status(400).json({
      error: 'Upload error',
      details: err.message,
    });
  }

  if (err) {
    return res.status(400).json({
      error: 'Upload error',
      details: err.message,
    });
  }

  next();
};

/**
 * Middleware to set upload type on request
 */
const setUploadType = (type) => (req, res, next) => {
  req.uploadType = type;
  next();
};

/**
 * Helper to safely delete files
 */
const deleteFile = (filePath) => {
  try {
    const fullPath = path.join(uploadsDir, filePath);

    // Prevent path traversal attacks
    if (!fullPath.startsWith(uploadsDir)) {
      throw new Error('Invalid file path');
    }

    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      return true;
    }
    return false;
  } catch (err) {
    console.error('❌ Error deleting file:', err.message);
    return false;
  }
};

/**
 * Helper to get file info safely
 */
const getFileInfo = (filePath) => {
  try {
    const fullPath = path.join(uploadsDir, filePath);

    // Prevent path traversal attacks
    if (!fullPath.startsWith(uploadsDir)) {
      throw new Error('Invalid file path');
    }

    if (!fs.existsSync(fullPath)) {
      return null;
    }

    const stats = fs.statSync(fullPath);
    return {
      path: filePath,
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
    };
  } catch (err) {
    console.error('❌ Error getting file info:', err.message);
    return null;
  }
};

/**
 * Helper to generate secure file download
 */
const getSecureFilePath = (filePath) => {
  try {
    const fullPath = path.join(uploadsDir, filePath);

    // Prevent path traversal attacks
    if (!fullPath.startsWith(uploadsDir)) {
      throw new Error('Access denied');
    }

    if (fs.existsSync(fullPath)) {
      return fullPath;
    }

    return null;
  } catch (err) {
    console.error('❌ Error getting file path:', err.message);
    return null;
  }
};

module.exports = {
  uploaders,
  createUploader,
  handleUploadError,
  setUploadType,
  deleteFile,
  getFileInfo,
  getSecureFilePath,
  ALLOWED_FILES,
  generateSecureFilename,
};
