/**
 * SECURITY IMPLEMENTATION GUIDE
 * 
 * Comprehensive documentation for all security features implemented in Courier SaaS
 * 
 * ========================================================================
 * TABLE OF CONTENTS
 * ========================================================================
 * 1. JWT Authentication
 * 2. Input Validation
 * 3. API Rate Limiting
 * 4. Secure File Uploads
 * 5. Audit Logging
 * 6. Security Middleware
 * 7. Integration Examples
 * ========================================================================
 */

// ============================================================================
// 1. JWT AUTHENTICATION (Already Implemented)
// ============================================================================

/**
 * JWT Tokens:
 * - Access Token: 15-minute expiry
 * - Refresh Token: 7-day expiry
 * 
 * Usage:
 * 1. User calls POST /api/auth/login with email/password
 * 2. Server returns { accessToken, refreshToken, user }
 * 3. Client stores tokens (accessToken in memory, refreshToken in secure cookie)
 * 4. All protected endpoints require "Authorization: Bearer {accessToken}"
 * 5. When accessToken expires, use refreshToken to get new tokens
 * 
 * Location: apps/api/src/middleware/auth.js
 * 
 * Example:
 * POST /api/auth/login
 * {
 *   "email": "user@example.com",
 *   "password": "securePassword123",
 *   "tenant_slug": "optional-tenant-name"
 * }
 * 
 * Response:
 * {
 *   "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
 *   "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
 *   "user": {
 *     "id": "user-uuid",
 *     "email": "user@example.com",
 *     "role": "admin",
 *     "tenantId": "tenant-uuid"
 *   }
 * }
 */

// ============================================================================
// 2. INPUT VALIDATION (New)
// ============================================================================

/**
 * COMPREHENSIVE INPUT VALIDATION SYSTEM
 * 
 * Location: apps/api/src/utils/validators.js
 * 
 * Provides:
 * - Email validation (RFC 5322 format)
 * - Password validation (customizable strength)
 * - String validation (length, special chars)
 * - Phone number validation
 * - URL validation
 * - UUID validation
 * - Geographic coordinates (latitude/longitude)
 * - Address validation
 * - City/location validation
 * - Slug validation
 * - And many more...
 * 
 * All validators include:
 * - Type checking
 * - Length validation
 * - Format validation
 * - Character set restrictions
 * - Sanitization (trim, escape)
 * 
 * 
 * HOW TO USE:
 * 
 * import { validators, handleValidationErrors } = require('utils/validators');
 * 
 * router.post('/create-shipment', [
 *   validators.string('name', { min: 2, max: 100 }),
 *   validators.email('sender_email'),
 *   validators.email('receiver_email'),
 *   validators.phone('sender_phone'),
 *   validators.latitude('pickup_lat'),
 *   validators.longitude('pickup_lng'),
 *   validators.address('pickup_address'),
 *   validators.city('pickup_city'),
 *   validators.float('weight_kg', { min: 0, max: 1000 }),
 * ], handleValidationErrors, controller.createShipment);
 * 
 * 
 * VALIDATION RESULT:
 * If validation fails, returns 400 with:
 * {
 *   "error": "Validation failed",
 *   "details": [
 *     {
 *       "field": "email",
 *       "message": "email must be a valid email address",
 *       "value": "invalid-email"
 *     }
 *   ]
 * }
 */

// ============================================================================
// 3. API RATE LIMITING (Already Implemented)
// ============================================================================

/**
 * THREE-TIER RATE LIMITING:
 * 
 * 1. DEFAULT LIMITER (All endpoints)
 *    - 15-minute window
 *    - Development: 1000 requests
 *    - Production: 100 requests
 * 
 * 2. AUTH LIMITER (Login/refresh endpoints)
 *    - 15-minute window
 *    - Development: 1000 requests
 *    - Production: 20 requests
 * 
 * 3. TRACKING LIMITER (Public tracking endpoint)
 *    - 1-minute window
 *    - Development: 1000 requests
 *    - Production: 30 requests
 * 
 * Location: apps/api/src/middleware/rateLimit.js
 * 
 * Bypass:
 * Set DISABLE_RATE_LIMIT=true in .env (for testing only!)
 * 
 * Response when limited:
 * HTTP 429
 * {
 *   "error": "Too many requests, please try again later."
 * }
 */

// ============================================================================
// 4. SECURE FILE UPLOADS (New)
// ============================================================================

/**
 * SAFE FILE UPLOAD HANDLER
 * 
 * Location: apps/api/src/utils/fileUpload.js
 * 
 * Features:
 * - Type validation (MIME type + file extension)
 * - File size limits
 * - Filename sanitization (prevents directory traversal)
 * - Secure storage with random filenames
 * - Multiple upload categories
 * 
 * SUPPORTED CATEGORIES:
 * 
 * 1. proofOfDelivery
 *    - Types: JPEG, PNG, WebP, PDF
 *    - Max size: 10MB
 *    - Single file
 * 
 * 2. documents
 *    - Types: PDF, DOC, DOCX
 *    - Max size: 25MB
 *    - Up to 5 files
 * 
 * 3. images
 *    - Types: JPEG, PNG, WebP, GIF
 *    - Max size: 5MB per file
 *    - Up to 10 files
 * 
 * 4. csv
 *    - Types: CSV, XLSX
 *    - Max size: 50MB
 *    - Single file
 * 
 * 
 * HOW TO USE:
 * 
 * import { uploaders, handleUploadError, setUploadType } = require('utils/fileUpload');
 * 
 * // Single file upload
 * router.post('/shipment/:id/proof', 
 *   auth,
 *   uploaders.proofOfDelivery.single('proof_image'),
 *   handleUploadError,
 *   controller.uploadProof
 * );
 * 
 * // Multiple file upload
 * router.post('/shipment/:id/docs',
 *   auth,
 *   uploaders.documents.array('documents', 5),
 *   handleUploadError,
 *   controller.uploadDocuments
 * );
 * 
 * // Custom upload handler
 * router.post('/import/csv',
 *   auth,
 *   setUploadType('import'),
 *   uploaders.csv.single('file'),
 *   handleUploadError,
 *   controller.importData
 * );
 * 
 * 
 * IN CONTROLLER:
 * 
 * const uploadProof = async (req, res) => {
 *   if (!req.file) {
 *     return res.status(400).json({ error: 'File required' });
 *   }
 * 
 *   // File info available as:
 *   // - req.file.filename: secure random filename
 *   // - req.file.path: storage path
 *   // - req.file.size: file size in bytes
 *   // - req.file.mimetype: validated MIME type
 * 
 *   // Store file path in database
 *   const shipment = await prisma.shipment.update({
 *     where: { id: req.params.id },
 *     data: { proof_image: req.file.filename }
 *   });
 * 
 *   res.json({ success: true, file: req.file.filename });
 * };
 * 
 * 
 * RESPONSE ON ERROR:
 * HTTP 400
 * {
 *   "error": "Upload error",
 *   "details": "Invalid file type. Allowed types: .jpg, .jpeg, .png, .webp, .pdf. Got: image/bmp"
 * }
 * 
 * 
 * SECURITY FEATURES:
 * - Filenames sanitized instantly
 * - Path traversal attempts blocked
 * - File type validated twice (MIME + extension)
 * - Size limits enforced
 * - Files stored outside web root
 * - Prevent script execution in upload folder (configure web server)
 */

// ============================================================================
// 5. AUDIT LOGGING (New)
// ============================================================================

/**
 * COMPREHENSIVE AUDIT LOGGING SYSTEM
 * 
 * Location: apps/api/src/utils/auditLog.js
 * 
 * Features:
 * - Dual storage (database + file system)
 * - Logs to both /logs directory and audit_logs table
 * - Predefined event types
 * - IP address and user agent tracking
 * - Detailed change tracking
 * 
 * PREDEFINED EVENTS:
 * - user.login, user.logout, user.token.refresh, user.login.failed
 * - user.create, user.update, user.delete, user.password.change
 * - shipment.create, shipment.update, shipment.delete, shipment.status.change
 * - tenant.create, tenant.update, tenant.delete
 * - hub.create, hub.update, hub.delete
 * - permission.grant, permission.revoke, role.change
 * - security.risk, security.suspicious, security.rate_limit, security.invalid_token
 * 
 * 
 * HOW TO USE:
 * 
 * import { helpers } = require('utils/auditLog');
 * 
 * // Log user action
 * helpers.logUserAction(
 *   'shipment.status.change',
 *   'shipment',
 *   shipmentId,
 *   userId,
 *   tenantId,
 *   { oldStatus: 'Created', newStatus: 'Picked_Up' }
 * );
 * 
 * // Log login
 * helpers.logLogin(userId, tenantId, ipAddress, userAgent, true);
 * 
 * // Log suspicious activity
 * helpers.logSuspicious(
 *   'Multiple failed login attempts',
 *   userId,
 *   tenantId,
 *   { attempts: 5, ip: ipAddress },
 *   ipAddress
 * );
 * 
 * // Log security risk
 * helpers.logSecurityRisk(
 *   'Brute force attack',
 *   'high',
 *   { ip: ipAddress, attempts: 10 },
 *   userId
 * );
 * 
 * 
 * DATABASE SCHEMA:
 * 
 * Table: audit_logs
 * Columns:
 * - id (UUID primary key)
 * - action (VARCHAR - event type)
 * - resource (VARCHAR - affected resource type)
 * - resourceId (VARCHAR - ID of affected resource)
 * - userId (VARCHAR - user who performed action)
 * - tenantId (VARCHAR - tenant context)
 * - changes (JSONB - what changed)
 * - status (VARCHAR - success/failed/warning)
 * - ipAddress (VARCHAR - source IP)
 * - userAgent (VARCHAR - browser/client info)
 * - details (JSONB - additional context)
 * - timestamp (TIMESTAMP - when occurred)
 * - created_at (TIMESTAMP - log creation time)
 * 
 * Indexes for fast queries:
 * - idx_audit_action (by action type)
 * - idx_audit_user (by user)
 * - idx_audit_tenant (by tenant)
 * - idx_audit_resource (by resource)
 * - idx_audit_time (by timestamp)
 * - idx_audit_tenant_time (by tenant + time)
 * - idx_audit_user_time (by user + time)
 * 
 * 
 * QUERYING AUDIT LOGS:
 * 
 * // All actions by user in time period
 * await prisma.auditLog.findMany({
 *   where: {
 *     userId,
 *     timestamp: { gte: startDate, lte: endDate }
 *   },
 *   orderBy: { timestamp: 'desc' }
 * });
 * 
 * // Security events
 * await prisma.auditLog.findMany({
 *   where: {
 *     action: { startsWith: 'security.' },
 *     status: 'error'
 *   }
 * });
 * 
 * // Changes to specific resource
 * await prisma.auditLog.findMany({
 *   where: { resourceId: shipmentId },
 *   orderBy: { timestamp: 'asc' }
 * });
 */

// ============================================================================
// 6. SECURITY MIDDLEWARE
// ============================================================================

/**
 * ADVANCED SECURITY MIDDLEWARE
 * 
 * Location: apps/api/src/middleware/security.js
 * 
 * Automatic Protections:
 * 
 * 1. suspiciousActivityDetector
 *    - Detects SQL injection patterns
 *    - Detects XSS patterns
 *    - Detects path traversal attempts
 *    - Logs findings
 * 
 * 2. bruteForceTracker
 *    - Tracks failed login attempts per IP
 *    - Locks account after 5 failed attempts
 *    - 15-minute lockout duration
 *    - Automatic unlock
 * 
 * 3. validateHeaders
 *    - Checks for suspicious headers
 *    - Prevents header-based attacks
 * 
 * 4. preventCSRF
 *    - Validates request origin
 *    - Checks referer header
 *    - Allows bearer token bypasses
 * 
 * 5. logApiErrors
 *    - Logs all API errors for security analysis
 *    - Detects authorization failures
 *    - Detects database-related errors
 * 
 * 6. preventNoSQLInjection
 *    - Checks for MongoDB operators
 *    - Blocks object-based injection
 * 
 * ALL MIDDLEWARE AUTO-INTEGRATED IN index.js
 * 
 * Enable/Disable in .env:
 * - DISABLE_RATE_LIMIT=true (for testing only)
 */

// ============================================================================
// 7. INTEGRATION EXAMPLES
// ============================================================================

/**
 * COMPLETE ENDPOINT EXAMPLE WITH ALL SECURITY FEATURES
 * 
 * Location: apps/api/src/modules/shipments/shipments.routes.js
 */

/*
import { Router } from 'express';
import { validators, handleValidationErrors } = require('utils/validators');
import { uploaders, handleUploadError } = require('utils/fileUpload');
import { helpers } = require('utils/auditLog');
import auth from 'middleware/auth';
import { allow } = require('middleware/rbac');

const router = Router();

// Create shipment with full validation and audit logging
router.post(
  '/create',
  auth,
  allow('admin', 'agent'),
  [
    validators.string('sender_name', { min: 2, max: 100 }),
    validators.email('sender_email'),
    validators.phone('sender_phone'),
    validators.address('sender_address'),
    validators.city('sender_city'),
    validators.string('receiver_name', { min: 2, max: 100 }),
    validators.email('receiver_email'),
    validators.phone('receiver_phone'),
    validators.address('receiver_address'),
    validators.city('receiver_city'),
    validators.float('weight_kg', { min: 0.1, max: 500 }),
    validators.optional(validators.string('special_instructions', { max: 500 })),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const shipment = await shipmentService.create(req.body, req.user);
      
      // Audit log
      helpers.logUserAction(
        'shipment.create',
        'shipment',
        shipment.id,
        req.user.userId,
        req.user.tenantId,
        { tracking_id: shipment.tracking_id, sender: req.body.sender_name }
      );
      
      res.json(shipment);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

// Upload proof of delivery
router.post(
  '/:id/proof',
  auth,
  allow('agent'),
  uploaders.proofOfDelivery.single('proof_image'),
  handleUploadError,
  async (req, res) => {
    try {
      const proof = await shipmentService.uploadProof(
        req.params.id,
        req.file,
        req.user
      );
      
      // Audit log
      helpers.logUserAction(
        'shipment.proof.upload',
        'shipment',
        req.params.id,
        req.user.userId,
        req.user.tenantId,
        { file: req.file.filename }
      );
      
      res.json(proof);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

module.exports = router;
*/

// ============================================================================
// 8. TESTING THE SECURITY FEATURES
// ============================================================================

/**
 * 
 * TEST 1: Input Validation
 * 
 * curl -X POST http://localhost:5000/api/shipments \
 *   -H "Authorization: Bearer {token}" \
 *   -H "Content-Type: application/json" \
 *   -d '{
 *     "sender_name": "A",
 *     "sender_email": "not-an-email",
 *     "sender_phone": "123"
 *   }'
 * 
 * Expected: 400 with validation errors
 * 
 * 
 * TEST 2: Rate Limiting
 * 
 * # Run 21+ rapid requests (exceeds limit of 20)
 * for i in {1..25}; do
 *   curl -X POST http://localhost:5000/api/auth/login \
 *     -H "Content-Type: application/json" \
 *     -d '{"email":"test@test.com","password":"pass"}'
 * done
 * 
 * Expected: 429 Too Many Requests after 20 attempts
 * 
 * 
 * TEST 3: Brute Force Detection
 * 
 * # Try 5+ failed logins
 * for i in {1..5}; do
 *   curl -X POST http://localhost:5000/api/auth/login \
 *     -H "Content-Type: application/json" \
 *     -d '{"email":"test@test.com","password":"wrong"}'
 * done
 * 
 * Expected: 429 after 5th attempt
 * 
 * 
 * TEST 4: SQL Injection Detection
 * 
 * curl -X POST http://localhost:5000/api/shipments \
 *   -H "Authorization: Bearer {token}" \
 *   -H "Content-Type: application/json" \
 *   -d '{
 *     "sender_name": "'; DROP TABLE shipments; --"
 *   }'
 * 
 * Expected: Logged as suspicious activity, request processed normally
 * 
 * 
 * TEST 5: XSS Detection
 * 
 * curl -X POST http://localhost:5000/api/shipments \
 *   -H "Authorization: Bearer {token}" \
 *   -H "Content-Type: application/json" \
 *   -d '{
 *     "sender_name": "<script>alert('XSS')</script>"
 *   }'
 * 
 * Expected: Logged as suspicious activity
 * 
 * 
 * TEST 6: Secure File Upload
 * 
 * # Valid upload
 * curl -X POST http://localhost:5000/api/shipments/123/proof \
 *   -H "Authorization: Bearer {token}" \
 *   -F "proof_image=@/path/to/image.jpg"
 * 
 * Expected: 200 with file info
 * 
 * # Invalid file type
 * curl -X POST http://localhost:5000/api/shipments/123/proof \
 *   -H "Authorization: Bearer {token}" \
 *   -F "proof_image=@/path/to/file.exe"
 * 
 * Expected: 400 with error message
 * 
 * # File too large (>10MB)
 * Expected: 400 with "File too large" error
 * 
 * 
 * TEST 7: Audit Logs
 * 
 * # Query user's actions
 * curl -X GET 'http://localhost:5000/api/audits?userId=user-uuid' \
 *   -H "Authorization: Bearer {admin-token}"
 * 
 * Expected: List of user's actions with timestamps, IPs, details
 * 
 * # Check logs in file system
 * tail -f ./logs/audit-2026-04-14.log
 * 
 * Expected: JSONL format with all events
 */

// ============================================================================
// 9. DEPLOYMENT CHECKLIST
// ============================================================================

/**
 * 
 * - [ ] Set JWT_SECRET to secure random value in .env
 * - [ ] Set NODE_ENV=production
 * - [ ] Disable rate limit override (DISABLE_RATE_LIMIT not set or false)
 * - [ ] Configure FRONTEND_URL to production domain
 * - [ ] Set up PostgreSQL database for audit_logs table
 * - [ ] Run: npm run migrate:deploy
 * - [ ] Configure file upload directory with restricted permissions
 * - [ ] Set up log rotation for audit logs
 * - [ ] Enable HTTPS/TLS for all endpoints
 * - [ ] Configure firewall rules to limit API access
 * - [ ] Set up monitoring for suspicious_activity logs
 * - [ ] Test all security features in staging
 * - [ ] Review audit logs regularly
 * - [ ] Set up alerts for security.risk events
 * 
 */

module.exports = {};
