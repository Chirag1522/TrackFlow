const service = require('./analytics.service');

const getSummary = async (req, res) => {
  try { res.json(await service.getSummary(req.tenantId)); }
  catch (err) { res.status(500).json({ error: err.message }); }
};
const getByStatus = async (req, res) => {
  try { res.json(await service.getByStatus(req.tenantId)); }
  catch (err) { res.status(500).json({ error: err.message }); }
};
const getAgentPerformance = async (req, res) => {
  try { res.json(await service.getAgentPerformance(req.tenantId)); }
  catch (err) { res.status(500).json({ error: err.message }); }
};

module.exports = { getSummary, getByStatus, getAgentPerformance };
