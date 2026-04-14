const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const service = require('./gps.service');
const auth = require('../../middleware/auth');
const tenant = require('../../middleware/tenant');
const { allow } = require('../../middleware/rbac');
const prisma = require('../../config/db');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

router.use(auth, tenant);

// Agent posts current GPS location
router.post(
  '/location',
  allow('agent'),
  [
    body('shipment_id').isUUID().withMessage('shipment_id must be a valid UUID'),
    body('latitude').isFloat({ min: -90, max: 90 }).withMessage('latitude must be between -90 and 90'),
    body('longitude').isFloat({ min: -180, max: 180 }).withMessage('longitude must be between -180 and 180'),
    body('accuracy_meters').optional().isInt({ min: 0 }).toInt(),
    body('speed_kmh').optional().isFloat({ min: 0 }).toFloat(),
    body('heading').optional().isFloat({ min: 0, max: 360 }).toFloat(),
  ],
  validate,
  async (req, res) => {
    try {
      const { shipment_id, latitude, longitude, accuracy_meters, speed_kmh, heading } = req.body;

      // Verify shipment belongs to tenant and agent is assigned
      const shipment = await prisma.shipment.findFirst({
        where: { id: shipment_id, tenant_id: req.tenantId },
      });
      if (!shipment) {
        return res.status(404).json({ error: 'Shipment not found' });
      }
      if (shipment.assigned_agent_id !== req.user.userId) {
        return res.status(403).json({ error: 'Agent not assigned to this shipment' });
      }

      const gpsRecord = await service.recordGpsLocation(
        shipment_id,
        req.tenantId,
        req.user.userId,
        latitude,
        longitude,
        { accuracy_meters, speed_kmh, heading }
      );

      res.json(gpsRecord);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
);

// Get latest GPS location for a shipment
router.get(
  '/latest/:shipment_id',
  allow('agent', 'admin'),
  async (req, res) => {
    try {
      const latest = await service.getLatestGpsLocation(req.params.shipment_id, req.tenantId);
      res.json(latest);
    } catch (err) {
      res.status(404).json({ error: err.message });
    }
  }
);

// Get GPS history for a shipment
router.get(
  '/history/:shipment_id',
  allow('agent', 'admin'),
  async (req, res) => {
    try {
      const { limit } = req.query;
      const history = await service.getGpsHistory(req.params.shipment_id, req.tenantId, limit ? parseInt(limit) : 50);
      res.json(history);
    } catch (err) {
      res.status(404).json({ error: err.message });
    }
  }
);

module.exports = router;