const fs = require('fs');
const path = require('path');
const prisma = require('../config/db');

/**
 * Basic audit logging system for tracking user actions
 * Logs to both database and file system for redundancy
 */

const logsDir = path.join(__dirname, '../../logs');

// Ensure logs directory exists
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Log file location
 */
const getLogFilePath = () => {
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return path.join(logsDir, `audit-${date}.log`);
};

/**
 * Write to audit log file
 */
const writeToFile = (logEntry) => {
  try {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] ${JSON.stringify(logEntry)}\n`;
    fs.appendFileSync(getLogFilePath(), logLine);
  } catch (err) {
    console.error('❌ Error writing to audit log file:', err.message);
  }
};

/**
 * Main audit log function
 * Logs user actions to database and file
 */
const auditLog = async ({
  action,
  resource,
  resourceId,
  userId,
  tenantId,
  changes = {},
  status = 'success',
  ipAddress = null,
  userAgent = null,
  details = null,
}) => {
  try {
    const logEntry = {
      action,
      resource,
      resourceId: resourceId || null,
      userId: userId || null,
      tenantId: tenantId || null,
      changes,
      status,
      ipAddress,
      userAgent,
      details,
      timestamp: new Date(),
    };

    // Write to file (synchronous, fast)
    writeToFile(logEntry);

    // Write to database (asynchronous, reliable)
    try {
      await prisma.auditLog.create({
        data: logEntry,
      });
    } catch (dbErr) {
      // DB might not have table yet, just log to console/file
      if (dbErr.message.includes('auditLog')) {
        console.warn('⚠️  AuditLog table not found, logging to file only');
      } else {
        throw dbErr;
      }
    }

    return true;
  } catch (err) {
    console.error('❌ Audit log error:', err.message);
    return false;
  }
};

/**
 * Middleware to extract IP and user agent for logging
 */
const auditMiddleware = (req, res, next) => {
  // Extract IP address
  req.auditIp = req.headers['x-forwarded-for']?.split(',')[0].trim() ||
               req.socket?.remoteAddress ||
               req.connection?.remoteAddress ||
               'unknown';

  // Extract user agent
  req.auditUserAgent = req.headers['user-agent'] || 'unknown';

  // Store user info for audit logging
  if (req.user) {
    req.auditUserId = req.user.userId;
    req.auditTenantId = req.user.tenantId;
  }

  next();
};

/**
 * Predefined audit events
 */
const events = {
  // Authentication events
  LOGIN: 'user.login',
  LOGOUT: 'user.logout',
  TOKEN_REFRESH: 'user.token.refresh',
  LOGIN_FAILED: 'user.login.failed',

  // User management events
  USER_CREATE: 'user.create',
  USER_UPDATE: 'user.update',
  USER_DELETE: 'user.delete',
  USER_PASSWORD_CHANGE: 'user.password.change',
  USER_DEACTIVATE: 'user.deactivate',
  USER_ACTIVATE: 'user.activate',

  // Shipment events
  SHIPMENT_CREATE: 'shipment.create',
  SHIPMENT_UPDATE: 'shipment.update',
  SHIPMENT_DELETE: 'shipment.delete',
  SHIPMENT_STATUS_CHANGE: 'shipment.status.change',
  SHIPMENT_ASSIGN_AGENT: 'shipment.assign_agent',
  SHIPMENT_PROOF_UPLOAD: 'shipment.proof.upload',

  // Tenant events
  TENANT_CREATE: 'tenant.create',
  TENANT_UPDATE: 'tenant.update',
  TENANT_DELETE: 'tenant.delete',

  // Hub events
  HUB_CREATE: 'hub.create',
  HUB_UPDATE: 'hub.update',
  HUB_DELETE: 'hub.delete',

  // Permission events
  PERMISSION_GRANT: 'permission.grant',
  PERMISSION_REVOKE: 'permission.revoke',
  ROLE_CHANGE: 'role.change',

  // Security events
  SECURITY_RISK: 'security.risk',
  SUSPICIOUS_ACTIVITY: 'security.suspicious',
  RATE_LIMIT_EXCEEDED: 'security.rate_limit',
  INVALID_TOKEN: 'security.invalid_token',
};

/**
 * Helper functions for common audit scenarios
 */
const helpers = {
  // Log user login
  logLogin: (userId, tenantId, ipAddress, userAgent, success = true) => {
    return auditLog({
      action: success ? events.LOGIN : events.LOGIN_FAILED,
      resource: 'user',
      userId,
      tenantId,
      status: success ? 'success' : 'failed',
      ipAddress,
      userAgent,
    });
  },

  // Log user action on resource
  logUserAction: (action, resource, resourceId, userId, tenantId, changes = {}) => {
    return auditLog({
      action,
      resource,
      resourceId,
      userId,
      tenantId,
      changes,
      status: 'success',
    });
  },

  // Log suspicious activity
  logSuspicious: (activity, userId = null, tenantId = null, details = null, ipAddress = null) => {
    return auditLog({
      action: events.SUSPICIOUS_ACTIVITY,
      resource: 'security',
      status: 'warning',
      details: details || activity,
      userId,
      tenantId,
      ipAddress,
    });
  },

  // Log security incident
  logSecurityRisk: (risk, severity = 'medium', details = null, userId = null) => {
    return auditLog({
      action: events.SECURITY_RISK,
      resource: 'security',
      status: 'error',
      details: {
        risk,
        severity,
        ...details,
      },
      userId,
    });
  },

  // Log rate limit exceeded
  logRateLimitExceeded: (ipAddress, endpoint, userAgent) => {
    return auditLog({
      action: events.RATE_LIMIT_EXCEEDED,
      resource: 'api',
      status: 'warning',
      ipAddress,
      userAgent,
      details: {
        endpoint,
      },
    });
  },
};

module.exports = {
  auditLog,
  auditMiddleware,
  events,
  helpers,
  getLogFilePath,
};
