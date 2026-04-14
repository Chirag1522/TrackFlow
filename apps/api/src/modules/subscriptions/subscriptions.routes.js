const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const controller = require('./subscriptions.controller');
const auth = require('../../middleware/auth');
const { allow } = require('../../middleware/rbac');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

router.use(auth, allow('super_admin'));
router.get('/', controller.getAll);
router.post('/',
  [body('name').notEmpty(), body('price').isNumeric(), body('max_shipments').isInt(), body('max_agents').isInt()],
  validate, controller.create);
router.patch(
  '/:id',
  [
    body('name').optional().isString().trim().notEmpty(),
    body('price').optional().isNumeric(),
    body('max_shipments').optional().isInt({ min: 0 }),
    body('max_agents').optional().isInt({ min: 0 }),
  ],
  validate,
  controller.update
);

module.exports = router;
