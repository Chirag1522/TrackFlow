const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const controller = require('./tenants.controller');
const auth = require('../../middleware/auth');
const { allow } = require('../../middleware/rbac');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

router.use(auth, allow('super_admin'));

router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.post(
  '/',
  [
    body('name').isString().trim().notEmpty(),
    body('slug').isString().trim().matches(/^[a-z0-9-]+$/),
    body('plan_id').optional({ nullable: true }).isString(),
    body('plan_valid_until').optional().isISO8601().withMessage('plan_valid_until must be a valid ISO date'),
    body('status').optional().isIn(['active', 'suspended', 'inactive']),
    body('admin_name').isString().trim().notEmpty().withMessage('admin_name is required'),
    body('admin_email').isEmail().withMessage('Valid admin_email required'),
    body('admin_password').isLength({ min: 6 }).withMessage('admin_password must be at least 6 characters'),
  ],
  validate,
  controller.create
);
router.patch(
  '/:id',
  [
    body('name').optional().isString().trim().notEmpty(),
    body('slug').optional().matches(/^[a-z0-9-]+$/),
    body('plan_id').optional({ nullable: true }).isUUID().withMessage('plan_id must be UUID or null'),
    body('plan_valid_until').optional().isISO8601().withMessage('plan_valid_until must be a valid ISO date'),
    body('status').optional().isIn(['active', 'suspended', 'inactive']),
  ],
  validate,
  controller.update
);
router.delete('/:id', controller.remove);

router.post(
  '/:id/admins',
  [
    body('name').isString().trim().notEmpty(),
    body('email').isEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  validate,
  controller.createAdmin
);

module.exports = router;
