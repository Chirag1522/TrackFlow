const router = require('express').Router();
const controller = require('./tracking.controller');
const { trackingLimiter } = require('../../middleware/rateLimit');
const auth = require('../../middleware/auth');
const tenant = require('../../middleware/tenant');
const { allow } = require('../../middleware/rbac');

router.get('/:tracking_id', trackingLimiter, controller.track);
router.patch(
	'/:tracking_id/request-return',
	trackingLimiter,
	auth,
	tenant,
	allow('customer', 'admin', 'super_admin'),
	controller.requestReturn
);

module.exports = router;
