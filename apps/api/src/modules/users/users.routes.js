const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const controller = require('./users.controller');
const auth = require('../../middleware/auth');
const tenant = require('../../middleware/tenant');
const { allow } = require('../../middleware/rbac');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

router.use(auth, tenant, allow('admin'));

router.get('/', controller.getAll);
router.post('/',
  [body('name').notEmpty(), body('email').isEmail(), body('password').isLength({ min: 6 }),
   body('role').isIn(['admin', 'agent', 'customer'])],
  validate, controller.create);
router.patch(
  '/:id',
  [
    body('name').optional().isString().trim().notEmpty(),
    body('password').optional().isLength({ min: 6 }),
    body('hub_id').optional({ nullable: true }).isUUID().withMessage('hub_id must be UUID or null'),
    body('is_active').optional().isBoolean(),
  ],
  validate,
  controller.update
);
router.delete('/:id', controller.remove);

module.exports = router;
