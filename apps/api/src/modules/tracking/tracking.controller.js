const service = require('./tracking.service');
const { queueShipmentReturnEmail } = require('../../jobs/emailJobs');

const track = async (req, res) => {
  try {
    res.json(await service.trackByTrackingId(req.params.tracking_id));
  } catch (err) {
    res.status(err.statusCode || 404).json({ error: err.message });
  }
};

const requestReturn = async (req, res) => {
  try {
    const result = await service.requestReturn(req.params.tracking_id, req.user);
    const { sender_email, ...publicResult } = result;

    if (sender_email) {
      queueShipmentReturnEmail({
        to: sender_email,
        trackingId: result.tracking_id,
        frontendUrl: process.env.FRONTEND_URL,
      }).catch(() => {});
    }

    res.json(publicResult);
  } catch (err) {
    res.status(err.statusCode || 400).json({ error: err.message });
  }
};

module.exports = { track, requestReturn };
