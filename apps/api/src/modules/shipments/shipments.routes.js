const router = require('express').Router();
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const controller = require('./shipments.controller');
const auth = require('../../middleware/auth');
const tenant = require('../../middleware/tenant');
const { allow } = require('../../middleware/rbac');
const { validateSenderReceiverEmails } = require('../../utils/validateEmail');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Only images allowed'));
    cb(null, true);
  },
});

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

const validateShipmentEmails = (req, res, next) => {
  try {
    const { sender_info, receiver_info } = req.body;
    validateSenderReceiverEmails(sender_info, receiver_info);
    next();
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const SHIPMENT_STATUSES = ['Created', 'Picked_Up', 'At_Sorting_Facility', 'In_Transit', 'Out_for_Delivery', 'Delivered', 'Failed', 'Retry', 'Returned'];

const assignAgentValidation = [
  body('agent_id').isString().notEmpty().withMessage('agent_id must be a non-empty string'),
];

const statusUpdateValidation = [
  body('status').isIn(SHIPMENT_STATUSES).withMessage('Invalid status value'),
  body('location').optional({ nullable: true }).isString().isLength({ max: 255 }),
  body('note').optional({ nullable: true }).isString().isLength({ max: 1000 }),
];

router.use(auth, tenant);

// Agent-specific routes
router.get('/workitems', allow('agent'), controller.getAgentWorkitems);

// General shipment routes
router.get('/', allow('admin', 'agent'), controller.getAll);
router.get('/:id', allow('admin', 'agent'), controller.getById);
router.get('/:id/available-agents', allow('admin'), controller.getAvailableAgents);
router.post('/', allow('admin'),
  [body('sender_info').isObject(), body('receiver_info').isObject()],
  validate, validateShipmentEmails, controller.create);
router.patch('/:id/assign-agent', allow('admin'), assignAgentValidation, validate, controller.assignAgent);
router.post('/:id/assign-agent', allow('admin'), assignAgentValidation, validate, controller.assignAgent);
router.patch('/:id/status', allow('agent', 'admin'), statusUpdateValidation, validate, controller.updateStatus);
router.post('/:id/status', allow('agent', 'admin'), statusUpdateValidation, validate, controller.updateStatus);
router.patch('/:id/transition-stage', allow('admin'), controller.transitionStage);
router.get('/:id/qr', allow('admin', 'agent'), controller.getQR);
router.post('/:id/proof', allow('agent', 'admin'), upload.single('proof'), controller.uploadProof);

module.exports = router;
