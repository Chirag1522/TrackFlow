/**
 * SECURITY FEATURES - QUICK REFERENCE & EXAMPLES
 * 
 * This file demonstrates how to use each security feature in your code
 */

// ============================================================================
// 1. INPUT VALIDATION EXAMPLES
// ============================================================================

/**
 * Example 1: Validate shipment creation
 */
const { validators, handleValidationErrors } = require('../utils/validators');
const router = require('express').Router();

router.post('/shipments', [
  // Sender info validation
  validators.string('sender_name', { min: 2, max: 100 }),
  validators.email('sender_email'),
  validators.phone('sender_phone'),
  validators.address('sender_address'),
  validators.city('sender_city'),
  
  // Receiver info validation
  validators.string('receiver_name', { min: 2, max: 100 }),
  validators.email('receiver_email'),
  validators.phone('receiver_phone'),
  validators.address('receiver_address'),
  validators.city('receiver_city'),
  
  // Package info
  validators.float('weight_kg', { min: 0.1, max: 500 }),
  validators.enum('service_type', ['standard', 'express', 'same-day']),
  validators.optional(validators.string('special_instructions', { max: 500 })),
], handleValidationErrors, async (req, res) => {
  try {
    const shipment = await shipmentService.create(req.body, req.user);
    res.status(201).json(shipment);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Example 2: Validate user creation
 */
router.post('/users', [
  validators.string('name', { min: 2, max: 255 }),
  validators.email('email'),
  validators.strongPassword('password'), // min 8, mixed case, number, special char
  validators.phone('phone'),
  validators.enum('role', ['admin', 'agent', 'customer']),
  validators.optional(validators.uuid('hub_id')),
], handleValidationErrors, async (req, res) => {
  try {
    const user = await userService.create(req.body);
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Example 3: Validate complex nested data
 */
router.post('/analytics/query', [
  validators.string('report_type'),
  validators.date('start_date'),
  validators.date('end_date'),
  validators.enum('grouping', ['daily', 'weekly', 'monthly']),
  validators.array('filters', { minItems: 0, maxItems: 10 }),
], handleValidationErrors, async (req, res) => {
  // Validation passed, now safe to process
  const analytics = await analyticsService.generateReport(req.body);
  res.json(analytics);
});

/**
 * What happens if validation fails:
 * HTTP 400
 * {
 *   "error": "Validation failed",
 *   "details": [
 *     {
 *       "field": "sender_email",
 *       "message": "sender_email must be a valid email address",
 *       "value": "not-an-email"
 *     }
 *   ]
 * }
 */

// ============================================================================
// 2. FILE UPLOAD EXAMPLES
// ============================================================================

const { uploaders, handleUploadError, setUploadType } = require('../utils/fileUpload');

/**
 * Example 1: Upload proof of delivery (single image)
 */
router.post('/shipments/:id/proof', 
  auth,
  uploaders.proofOfDelivery.single('proof_image'),
  handleUploadError,
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Proof image required' });
      }

      // File properties available:
      // - req.file.filename: secure filename
      // - req.file.path: storage path
      // - req.file.size: file size
      // - req.file.mimetype: validated MIME type
      // - req.file.originalname: original filename

      const proof = await proofService.save({
        shipmentId: req.params.id,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
      });

      res.json(proof);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

/**
 * Example 2: Upload multiple documents
 */
router.post('/shipments/:id/documents',
  auth,
  uploaders.documents.array('documents', 5),
  handleUploadError,
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'At least one document required' });
      }

      // req.files is an array
      const saved = await Promise.all(
        req.files.map(file => docService.save({
          shipmentId: req.params.id,
          filename: file.filename,
          size: file.size,
        }))
      );

      res.json({ uploaded: saved.length, documents: saved });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

/**
 * Example 3: Import CSV file
 */
router.post('/import/shipments',
  auth,
  setUploadType('import'),
  uploaders.csv.single('file'),
  handleUploadError,
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'CSV file required' });
      }

      const result = await importService.parseAndImport(req.file.path);
      res.json({
        imported: result.count,
        errors: result.errors,
        warnings: result.warnings,
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

/**
 * Upload errors return HTTP 400:
 * {
 *   "error": "Upload error",
 *   "details": "Invalid file type. Allowed types: .jpg, .jpeg, .png, .webp, .pdf. Got: image/bmp"
 * }
 */

// ============================================================================
// 3. AUDIT LOGGING EXAMPLES
// ============================================================================

const { helpers, events } = require('../utils/auditLog');

/**
 * Example 1: Log user creation
 */
async function createUser(userData, adminUser) {
  const user = await prisma.user.create({
    data: userData,
  });

  // Log the action
  await helpers.logUserAction(
    events.USER_CREATE,
    'user',
    user.id,
    adminUser.id,
    adminUser.tenantId,
    {
      email: user.email,
      role: user.role,
      name: user.name,
    }
  );

  return user;
}

/**
 * Example 2: Log shipment status change
 */
async function updateShipmentStatus(shipmentId, newStatus, userId, tenantId) {
  const oldShipment = await prisma.shipment.findUnique({
    where: { id: shipmentId },
  });

  const updated = await prisma.shipment.update({
    where: { id: shipmentId },
    data: { status: newStatus },
  });

  // Log the change with before/after
  await helpers.logUserAction(
    events.SHIPMENT_STATUS_CHANGE,
    'shipment',
    shipmentId,
    userId,
    tenantId,
    {
      oldStatus: oldShipment.status,
      newStatus: newStatus,
      tracking_id: updated.tracking_id,
    }
  );

  return updated;
}

/**
 * Example 3: Log suspicious activity (called from middleware)
 */
async function detectSuspiciousActivity(pattern, ipAddress) {
  await helpers.logSuspicious(
    `Detected ${pattern} pattern in request`,
    null, // userId (not logged in)
    null, // tenantId (not applicable)
    { pattern, timestamp: new Date() },
    ipAddress
  );
}

/**
 * Example 4: Log security risk (called from security middleware)
 */
async function detectSecurityRisk() {
  await helpers.logSecurityRisk(
    'Brute force attack detected',
    'high',
    { ipAddress: '192.168.1.1', attempts: 10 },
    null
  );
}

/**
 * Example 5: Query audit logs
 */
async function getUserAuditLog(userId, tenantId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return await prisma.auditLog.findMany({
    where: {
      userId,
      tenantId,
      timestamp: { gte: startDate },
    },
    orderBy: { timestamp: 'desc' },
    take: 100,
  });
}

/**
 * Audit log entry structure:
 * {
 *   "id": "uuid",
 *   "action": "shipment.status.change",
 *   "resource": "shipment",
 *   "resourceId": "shipment-uuid",
 *   "userId": "user-uuid",
 *   "tenantId": "tenant-uuid",
 *   "changes": {
 *     "oldStatus": "Created",
 *     "newStatus": "Picked_Up"
 *   },
 *   "status": "success",
 *   "ipAddress": "203.0.113.42",
 *   "userAgent": "Mozilla/5.0...",
 *   "timestamp": "2026-04-14T10:30:00Z"
 * }
 */

// ============================================================================
// 4. SECURITY MIDDLEWARE (AUTO-ENABLED)
// ============================================================================

/**
 * All security middleware is automatically integrated in index.js
 * and runs on every request:
 * 
 * ✅ auditMiddleware - Extracts IP, user agent for logging
 * ✅ validateHeaders - Checks for suspicious headers
 * ✅ preventNoSQLInjection - Blocks MongoDB operators
 * ✅ suspiciousActivityDetector - Detects SQL/XSS/path traversal
 * ✅ preventCSRF - Validates origin
 * ✅ bruteForceTracker - Tracks failed logins
 * 
 * No additional code required - just works automatically!
 */

// ============================================================================
// 5. RATE LIMITING (ALREADY RUNNING)
// ============================================================================

/**
 * Rate limiting is automatically applied by defaultLimiter middleware.
 * 
 * Limits per endpoint:
 * - Default: 100 requests per 15 minutes (production)
 * - Auth: 20 requests per 15 minutes
 * - Tracking: 30 requests per 1 minute
 * 
 * When limit exceeded: HTTP 429
 * {
 *   "error": "Too many requests, please try again later."
 * }
 * 
 * To test without limits: DISABLE_RATE_LIMIT=true npm run dev
 */

// ============================================================================
// 6. JWT AUTHENTICATION (ALREADY IMPLEMENTED)
// ============================================================================

/**
 * Protected endpoints require Bearer token:
 * 
 * Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 * 
 * Tokens include:
 * - userId
 * - role (admin, agent, customer)
 * - tenantId
 * - hubId
 * 
 * Access token: 15 minutes
 * Refresh token: 7 days
 */

// ============================================================================
// COMPLETE ENDPOINT EXAMPLE
// ============================================================================

/**
 * Full example with all security features
 */

const express = require('express');
const auth = require('../middleware/auth');
const { allow } = require('../middleware/rbac');
const { validators, handleValidationErrors } = require('../utils/validators');
const { uploaders, handleUploadError } = require('../utils/fileUpload');
const { helpers } = require('../utils/auditLog');

const router = express.Router();

// Protected endpoint with input validation, file upload, and audit logging
router.post(
  '/:shipmentId/complete',
  auth,
  allow('agent'),
  [
    validators.string('completion_note', { min: 10, max: 500 }),
    validators.enum('rating', ['1', '2', '3', '4', '5']),
  ],
  handleValidationErrors,
  uploaders.proofOfDelivery.single('signature'),
  handleUploadError,
  async (req, res) => {
    try {
      // All inputs are validated at this point
      const { shipmentId } = req.params;
      const { completion_note, rating } = req.body;

      // Verify agent is assigned to shipment
      const shipment = await prisma.shipment.findUnique({
        where: { id: shipmentId },
      });

      if (shipment.assigned_agent_id !== req.user.userId) {
        return res.status(403).json({ error: 'Not assigned to this shipment' });
      }

      // Update shipment
      const updated = await prisma.shipment.update({
        where: { id: shipmentId },
        data: {
          status: 'Delivered',
          proof_image: req.file?.filename,
          completed_note: completion_note,
          agent_rating: rating,
        },
      });

      // Audit log the action
      await helpers.logUserAction(
        'shipment.completed',
        'shipment',
        shipmentId,
        req.user.userId,
        req.user.tenantId,
        {
          status: 'Delivered',
          rating,
          hasProof: !!req.file,
        }
      );

      res.json({
        success: true,
        shipment: updated,
      });
    } catch (error) {
      // Errors are automatically logged to audit logs
      res.status(400).json({ error: error.message });
    }
  }
);

module.exports = router;

/**
 * This endpoint demonstrates:
 * ✅ JWT authentication required
 * ✅ RBAC - only agents can complete
 * ✅ Input validation - note length, rating enum
 * ✅ File validation - proof image MIME type
 * ✅ Business logic validation - agent assignment check
 * ✅ Audit logging - automatic record of action
 * ✅ Rate limiting - automatic per IP
 * ✅ Security middleware - SQL injection detection, CSRF check
 * 
 * All with minimal code overhead!
 */
