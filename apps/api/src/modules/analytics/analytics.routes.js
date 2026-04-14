const router = require('express').Router();
const controller = require('./analytics.controller');
const auth = require('../../middleware/auth');
const tenant = require('../../middleware/tenant');
const { allow } = require('../../middleware/rbac');

router.use(auth, tenant, allow('admin'));
router.get('/summary', controller.getSummary);
router.get('/shipments-by-status', controller.getByStatus);
router.get('/agent-performance', controller.getAgentPerformance);

module.exports = router;
