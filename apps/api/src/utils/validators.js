const { body, param, query, validationResult } = require('express-validator');

/**
 * Comprehensive input validation utilities for all API endpoints
 * Covers email, phone, URL, UUID, strings, numbers, and custom domain validations
 */

// ============= COMMON FIELD VALIDATORS =============

const validators = {
  // Email validation
  email: (field = 'email') =>
    body(field)
      .trim()
      .toLowerCase()
      .isEmail()
      .withMessage(`${field} must be a valid email address`)
      .normalizeEmail(),

  // Email in query params
  emailQuery: (field = 'email') =>
    query(field)
      .trim()
      .toLowerCase()
      .isEmail()
      .withMessage(`${field} must be a valid email address`),

  // Password validation (min 6 chars, at least one number and letter)
  password: (field = 'password', options = {}) => {
    const { min = 6, requireSpecial = false } = options;
    let chain = body(field)
      .isLength({ min })
      .withMessage(`${field} must be at least ${min} characters`);

    if (requireSecial) {
      chain = chain.matches(/^(?=.*[A-Za-z])(?=.*\d)/)
        .withMessage(`${field} must contain letters and numbers`);
    }
    return chain;
  },

  // Strong password (min 8, letter, number, special char)
  strongPassword: (field = 'password') =>
    body(field)
      .isLength({ min: 8 })
      .withMessage(`${field} must be at least 8 characters`)
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
      .withMessage(`${field} must contain uppercase, lowercase, number, and special character`),

  // String validation
  string: (field, options = {}) => {
    const { min = 1, max = 255, trim = true } = options;
    let chain = body(field);
    if (trim) chain = chain.trim();
    chain = chain.isString().withMessage(`${field} must be a string`);
    if (min > 0) chain = chain.isLength({ min }).withMessage(`${field} must be at least ${min} characters`);
    if (max > 0) chain = chain.isLength({ max }).withMessage(`${field} must be at most ${max} characters`);
    return chain;
  },

  // String query param
  stringQuery: (field, options = {}) => {
    const { min = 1, max = 255, trim = true } = options;
    let chain = query(field);
    if (trim) chain = chain.trim();
    chain = chain.isString().withMessage(`${field} must be a string`);
    if (min > 0) chain = chain.isLength({ min }).withMessage(`${field} must be at least ${min} characters`);
    if (max > 0) chain = chain.isLength({ max }).withMessage(`${field} must be at most ${max} characters`);
    return chain;
  },

  // Phone number validation (international format)
  phone: (field = 'phone') =>
    body(field)
      .trim()
      .matches(/^[\d\s\-\+\(\)]+$/)
      .withMessage(`${field} must be a valid phone number`)
      .isLength({ min: 7, max: 20 })
      .withMessage(`${field} must be between 7 and 20 characters`),

  // URL validation
  url: (field = 'url') =>
    body(field)
      .trim()
      .isURL({ require_protocol: true })
      .withMessage(`${field} must be a valid URL with protocol`),

  // UUID validation
  uuid: (field = 'id') =>
    param(field)
      .isUUID()
      .withMessage(`${field} must be a valid UUID`),

  // Integer validation
  integer: (field, options = {}) => {
    const { min, max } = options;
    let chain = body(field).isInt().withMessage(`${field} must be an integer`);
    if (typeof min === 'number') chain = chain.custom((val) => {
      if (val < min) throw new Error(`${field} must be at least ${min}`);
      return true;
    });
    if (typeof max === 'number') chain = chain.custom((val) => {
      if (val > max) throw new Error(`${field} must be at most ${max}`);
      return true;
    });
    return chain;
  },

  // Float validation
  float: (field, options = {}) => {
    const { min, max } = options;
    let chain = body(field).isFloat().withMessage(`${field} must be a number`);
    if (typeof min === 'number') chain = chain.custom((val) => {
      if (val < min) throw new Error(`${field} must be at least ${min}`);
      return true;
    });
    if (typeof max === 'number') chain = chain.custom((val) => {
      if (val > max) throw new Error(`${field} must be at most ${max}`);
      return true;
    });
    return chain;
  },

  // Enum validation
  enum: (field, options = []) =>
    body(field)
      .isIn(options)
      .withMessage(`${field} must be one of: ${options.join(', ')}`),

  // Boolean validation
  boolean: (field) =>
    body(field)
      .isBoolean()
      .withMessage(`${field} must be a boolean`),

  // Date validation (ISO 8601)
  date: (field) =>
    body(field)
      .isISO8601()
      .withMessage(`${field} must be a valid ISO 8601 date`),

  // Array validation
  array: (field, options = {}) => {
    const { minItems = 0, maxItems = 100 } = options;
    let chain = body(field).isArray().withMessage(`${field} must be an array`);
    if (minItems > 0) {
      chain = chain.custom((val) => {
        if (val.length < minItems) throw new Error(`${field} must have at least ${minItems} items`);
        return true;
      });
    }
    if (maxItems > 0) {
      chain = chain.custom((val) => {
        if (val.length > maxItems) throw new Error(`${field} must have at most ${maxItems} items`);
        return true;
      });
    }
    return chain;
  },

  // Geolocation validation (latitude & longitude)
  latitude: (field = 'latitude') =>
    body(field)
      .isFloat({ min: -90, max: 90 })
      .withMessage(`${field} must be between -90 and 90`),

  longitude: (field = 'longitude') =>
    body(field)
      .isFloat({ min: -180, max: 180 })
      .withMessage(`${field} must be between -180 and 180`),

  // Address validation
  address: (field = 'address', options = {}) => {
    const { min = 5, max = 500 } = options;
    return body(field)
      .trim()
      .isString()
      .withMessage(`${field} must be a string`)
      .isLength({ min, max })
      .withMessage(`${field} must be between ${min} and ${max} characters`)
      .matches(/^[a-zA-Z0-9\s,.\-#'&()]+$/)
      .withMessage(`${field} contains invalid characters`);
  },

  // City/location name validation
  city: (field = 'city') =>
    body(field)
      .trim()
      .isString()
      .withMessage(`${field} must be a string`)
      .isLength({ min: 2, max: 100 })
      .withMessage(`${field} must be between 2 and 100 characters`)
      .matches(/^[a-zA-Z\s\-']+$/)
      .withMessage(`${field} can only contain letters, spaces, hyphens, and apostrophes`),

  // Slug validation (lowercase, letters, numbers, hyphens)
  slug: (field = 'slug') =>
    body(field)
      .trim()
      .toLowerCase()
      .matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .withMessage(`${field} must be lowercase with letters, numbers, and hyphens only`),

  // Name validation
  name: (field = 'name', options = {}) => {
    const { min = 2, max = 255 } = options;
    return body(field)
      .trim()
      .isString()
      .withMessage(`${field} must be a string`)
      .isLength({ min, max })
      .withMessage(`${field} must be between ${min} and ${max} characters`)
      .matches(/^[a-zA-Z\s\-']+$/)
      .withMessage(`${field} can only contain letters, spaces, hyphens, and apostrophes`);
  },

  // Optional field (allows undefined/null)
  optional: (field) =>
    body(field).optional({ checkFalsy: true }),

  // Required field
  required: (field) =>
    body(field).notEmpty().withMessage(`${field} is required`),
};

/**
 * Validation error handler middleware
 * Formats and returns validation errors in consistent format
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map((err) => ({
        field: err.param,
        message: err.msg,
        value: err.value,
      })),
    });
  }
  next();
};

/**
 * Sanitization functions
 */
const sanitize = {
  // Sanitize string input (trim, escape HTML)
  string: (value) => {
    if (typeof value !== 'string') return value;
    return value.trim().replace(/[<>]/g, '');
  },

  // Sanitize email
  email: (value) => {
    if (typeof value !== 'string') return value;
    return value.trim().toLowerCase();
  },

  // Sanitize URL
  url: (value) => {
    if (typeof value !== 'string') return value;
    try {
      return new URL(value).toString();
    } catch {
      return value;
    }
  },

  // Sanitize filename
  filename: (filename) => {
    if (typeof filename !== 'string') return filename;
    // Remove path traversal and special characters
    return filename
      .replace(/\.\./g, '')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .substring(0, 255);
  },
};

module.exports = {
  validators,
  handleValidationErrors,
  sanitize,
  body,
  param,
  query,
  validationResult,
};
