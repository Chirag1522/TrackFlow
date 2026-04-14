const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const controller = require('./hubs.controller');
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
router.post('/', [body('name').notEmpty(), body('city').notEmpty(), body('address').notEmpty()], validate, controller.create);
router.patch(
  '/:id',
  [
    body('name').optional().isString().trim().notEmpty(),
    body('city').optional().isString().trim().notEmpty(),
    body('address').optional().isString().trim().notEmpty(),
  ],
  validate,
  controller.update
);
router.delete('/:id', controller.remove);

module.exports = router;
