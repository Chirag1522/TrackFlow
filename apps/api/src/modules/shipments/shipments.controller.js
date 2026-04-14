const cloudinary = require('cloudinary').v2;
const service = require('./shipments.service');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const getAll = async (req, res) => {
  try {
    const { status, agent } = req.query;
    // Agents see only their shipments
    if (req.user.role === 'agent') {
      return res.json(await service.getAgentShipments(req.tenantId, req.user.userId));
    }
    res.json(await service.getAll(req.tenantId, { status, agent }));
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const getById = async (req, res) => {
  try { res.json(await service.getById(req.tenantId, req.params.id)); }
  catch (err) { res.status(404).json({ error: err.message }); }
};

const getAvailableAgents = async (req, res) => {
  try {
    res.json(await service.getAvailableAgents(req.tenantId, req.params.id));
  } catch (err) { res.status(404).json({ error: err.message }); }
};

const create = async (req, res) => {
  try { res.status(201).json(await service.create(req.tenantId, req.user.userId, req.body)); }
  catch (err) { res.status(400).json({ error: err.message }); }
};

const assignAgent = async (req, res) => {
  try {
    const { agent_id } = req.body;
    if (!agent_id) return res.status(400).json({ error: 'agent_id required' });
    res.json(await service.assignAgent(req.tenantId, req.params.id, agent_id));
  } catch (err) { res.status(400).json({ error: err.message }); }
};

const updateStatus = async (req, res) => {
  try {
    const { status, location, note } = req.body;
    if (!status) return res.status(400).json({ error: 'status required' });
    const result = await service.updateStatus(req.tenantId, req.params.id, req.user.userId, { status, location, note });
    
    // Send return email to sender if shipment is marked as Returned
    if (status === 'Returned' && result.sender_info && result.sender_info.email) {
      queueShipmentReturnEmail({
        to: result.sender_info.email,
        trackingId: result.tracking_id,
        frontendUrl: process.env.FRONTEND_URL,
      }).catch(() => {});
    }
    
    res.json(result);
  } catch (err) { res.status(400).json({ error: err.message }); }
};

const getQR = async (req, res) => {
  try {
    const qr = await service.getQR(req.tenantId, req.params.id);
    res.json({ qr_code: qr });
  } catch (err) { res.status(404).json({ error: err.message }); }
};

const uploadProof = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    // Upload to Cloudinary
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'courier-proof', resource_type: 'image' },
        (error, result) => error ? reject(error) : resolve(result)
      );
      stream.end(req.file.buffer);
    });
    const updated = await service.uploadProof(req.tenantId, req.params.id, req.user.userId, result.secure_url);
    res.json({ proof_image_url: result.secure_url, event: updated });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const getAgentWorkitems = async (req, res) => {
  try {
    if (req.user.role !== 'agent') return res.status(403).json({ error: 'Only agents can view workitems' });
    res.json(await service.getAgentWorkitems(req.tenantId, req.user.userId));
  } catch (err) { res.status(400).json({ error: err.message }); }
};

const transitionStage = async (req, res) => {
  try {
    res.json(await service.transitionStage(req.tenantId, req.params.id, req.user.userId));
  } catch (err) { res.status(400).json({ error: err.message }); }
};

module.exports = { getAll, getById, getAvailableAgents, create, assignAgent, updateStatus, getQR, uploadProof, getAgentWorkitems, transitionStage };
