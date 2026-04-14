const { helpers } = require('../utils/auditLog');

/**
 * Security middleware for detecting and logging suspicious activities
 * Implements basic intrusion detection and anomaly logging
 */

/**
 * Detect suspicious input patterns
 */
const detectSuspiciousInput = (obj, depth = 0) => {
  if (depth > 10) return null; // Prevent infinite recursion
  if (!obj || typeof obj !== 'object') return null;

  const risks = [];

  // Scan for SQL injection patterns
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|EXEC|EXECUTE)\b)/i,
    /(-{2}|\/\*|\*\/|;|'|")/,
  ];

  // Scan for XSS patterns
  const xssPatterns = [
    /<script[^>]*>/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe/i,
  ];

  // Scan for path traversal
  const pathTraversalPattern = /\.\.\//;

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      if (sqlPatterns.some((p) => p.test(value))) {
        risks.push({ field: key, pattern: 'SQL injection attempt' });
      }
      if (xssPatterns.some((p) => p.test(value))) {
        risks.push({ field: key, pattern: 'XSS attempt' });
      }
      if (pathTraversalPattern.test(value)) {
        risks.push({ field: key, pattern: 'Path traversal attempt' });
      }
    } else if (typeof value === 'object') {
      const nestedRisks = detectSuspiciousInput(value, depth + 1);
      if (nestedRisks) {
        risks.push(...nestedRisks);
      }
    }
  }

  return risks.length > 0 ? risks : null;
};

/**
 * Middleware to detect and log suspicious activities
 */
const suspiciousActivityDetector = (req, res, next) => {
  // Check request body for suspicious patterns
  if (req.body && typeof req.body === 'object') {
    const risks = detectSuspiciousInput(req.body);
    if (risks && risks.length > 0) {
      // Log suspicious activity
      helpers.logSuspicious(
        `Suspicious input pattern detected: ${risks.map((r) => r.pattern).join(', ')}`,
        req.auditUserId || null,
        req.auditTenantId || null,
        { risks },
        req.auditIp
      );

      // For production, might want to reject these requests
      // For now, just log them
    }
  }

  // Check query params
  if (req.query && typeof req.query === 'object') {
    const risks = detectSuspiciousInput(req.query);
    if (risks && risks.length > 0) {
      helpers.logSuspicious(
        `Suspicious query parameter detected: ${risks.map((r) => r.pattern).join(', ')}`,
        req.auditUserId || null,
        req.auditTenantId || null,
        { risks },
        req.auditIp
      );
    }
  }

  next();
};

/**
 * Middleware to detect brute force attacks on auth endpoints
 * Tracks failed login attempts per IP
 */
const bruteForceTracker = (() => {
  const attempts = new Map(); // IP -> { count, lastAttempt, locked }

  return (req, res, next) => {
    const ip = req.auditIp;
    const now = Date.now();
    const threshold = 5; // Failed attempts threshold
    const lockoutDuration = 15 * 60 * 1000; // 15 minutes

    if (!attempts.has(ip)) {
      attempts.set(ip, { count: 0, lastAttempt: now, locked: false });
    }

    const attempt = attempts.get(ip);

    // Reset counter if more than 1 hour has passed
    if (now - attempt.lastAttempt > 60 * 60 * 1000) {
      attempt.count = 0;
      attempt.locked = false;
    }

    // Check if currently locked
    if (attempt.locked && now - attempt.lastAttempt < lockoutDuration) {
      helpers.logSuspicious(
        `Brute force attack detected - Account locked for IP`,
        null,
        null,
        { ip, attempts: attempt.count },
        ip
      );

      return res.status(429).json({
        error: 'Too many login attempts',
        retryAfter: Math.ceil((lockoutDuration - (now - attempt.lastAttempt)) / 1000),
      });
    }

    // Store reference for later update after auth check
    req.bruteForceTracker = { attempts, ip, attempt };

    next();
  };
})();

/**
 * Helper to record failed login attempt
 */
const recordFailedLogin = (req) => {
  if (req.bruteForceTracker) {
    const { attempts, ip, attempt } = req.bruteForceTracker;
    attempt.count++;
    attempt.lastAttempt = Date.now();

    if (attempt.count >= 5) {
      attempt.locked = true;
      helpers.logSecurityRisk(
        'Brute force attack',
        'high',
        { ip, attempts: attempt.count, locked: true },
        null
      );
    }

    attempts.set(ip, attempt);
  }
};

/**
 * Helper to reset login attempts after successful login
 */
const resetLoginAttempts = (req) => {
  if (req.bruteForceTracker) {
    const { attempts, ip } = req.bruteForceTracker;
    attempts.set(ip, { count: 0, lastAttempt: Date.now(), locked: false });
  }
};

/**
 * Middleware to validate request headers
 * Prevents common attack vectors
 */
const validateHeaders = (req, res, next) => {
  // Check for suspicious headers
  const suspiciousHeaders = [
    'x-forwarded-host',
    'x-original-url',
    'x-rewrite-url',
  ];

  const headersMismatch = [];
  for (const header of suspiciousHeaders) {
    if (req.headers[header]) {
      headersMismatch.push(header);
    }
  }

  if (headersMismatch.length > 0) {
    helpers.logSuspicious(
      `Suspicious headers detected: ${headersMismatch.join(', ')}`,
      req.auditUserId || null,
      req.auditTenantId || null,
      { headers: headersMismatch },
      req.auditIp
    );
  }

  next();
};

/**
 * Middleware to prevent CSRF attacks
 * Validates referer header
 */
const preventCSRF = (req, res, next) => {
  // Only check state-changing operations
  if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) {
    return next();
  }

  // Skip if request has valid auth token (API usage)
  if (req.headers.authorization?.startsWith('Bearer ')) {
    return next();
  }

  // For form submissions, validate referer
  const referer = req.headers.referer;
  if (!referer) {
    // Could be API client without referer, allow but log
    return next();
  }

  const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:5173';
  if (!referer.startsWith(allowedOrigin)) {
    helpers.logSuspicious(
      `Potential CSRF attack - Invalid referer`,
      req.auditUserId || null,
      req.auditTenantId || null,
      { referer, expected: allowedOrigin },
      req.auditIp
    );

    return res.status(403).json({ error: 'Invalid request origin' });
  }

  next();
};

/**
 * Middleware to log all API errors for security analysis
 */
const logApiErrors = (err, req, res, next) => {
  // Extract error details
  const errorInfo = {
    message: err.message,
    code: err.code,
    statusCode: err.statusCode || 500,
    path: req.path,
    method: req.method,
  };

  // Log potential security issues
  if (err.statusCode === 401 || err.message?.includes('Unauthorized')) {
    helpers.logSuspicious(
      'Authorization failure',
      req.auditUserId || null,
      req.auditTenantId || null,
      errorInfo,
      req.auditIp
    );
  }

  if (err.message?.includes('database') || err.message?.includes('permission')) {
    helpers.logSuspicious(
      'Suspicious error - possible database attack',
      req.auditUserId || null,
      req.auditTenantId || null,
      errorInfo,
      req.auditIp
    );
  }

  next(err);
};

/**
 * Middleware to detect and prevent NoSQL injection
 */
const preventNoSQLInjection = (req, res, next) => {
  const checkValue = (value) => {
    if (typeof value === 'string') {
      // Check for MongoDB operators
      if (value.match(/^\s*\$/) || value.match(/^\s*\{.*\}/)) {
        return true;
      }
    } else if (typeof value === 'object' && value !== null) {
      for (const key in value) {
        if (key.startsWith('$') || checkValue(value[key])) {
          return true;
        }
      }
    }
    return false;
  };

  if (checkValue(req.body) || checkValue(req.query) || checkValue(req.params)) {
    helpers.logSecurityRisk(
      'Potential NoSQL injection attack detected',
      'high',
      { path: req.path, method: req.method },
      req.auditUserId
    );

    return res.status(400).json({
      error: 'Invalid input detected',
    });
  }

  next();
};

module.exports = {
  suspiciousActivityDetector,
  bruteForceTracker,
  recordFailedLogin,
  resetLoginAttempts,
  validateHeaders,
  preventCSRF,
  logApiErrors,
  preventNoSQLInjection,
  detectSuspiciousInput,
};
