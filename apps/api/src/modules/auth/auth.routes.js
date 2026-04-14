const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const controller = require('./auth.controller');
const { authLimiter } = require('../../middleware/rateLimit');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

router.post(
  '/login',
  authLimiter,
  [
    body('email').isEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password required'),
    body('tenant_slug')
      .optional()
      .isString()
      .matches(/^[a-z0-9-]+$/)
      .withMessage('tenant_slug must use lowercase letters, numbers, and hyphens only'),
  ],
  validate,
  controller.login
);

router.post('/refresh', controller.refresh);
router.post('/logout', controller.logout);

module.exports = router;
