const service = require('./users.service');

const getAll = async (req, res) => {
  try { res.json(await service.getAll(req.tenantId)); }
  catch (err) { res.status(500).json({ error: err.message }); }
};

const create = async (req, res) => {
  try { res.status(201).json(await service.create(req.tenantId, req.body)); }
  catch (err) { res.status(400).json({ error: err.message }); }
};

const update = async (req, res) => {
  try { res.json(await service.update(req.tenantId, req.params.id, req.body)); }
  catch (err) { res.status(400).json({ error: err.message }); }
};

const remove = async (req, res) => {
  try { await service.remove(req.tenantId, req.params.id); res.json({ message: 'User deactivated' }); }
  catch (err) { res.status(400).json({ error: err.message }); }
};

module.exports = { getAll, create, update, remove };
