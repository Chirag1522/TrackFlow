const { addEmailJob, EMAIL_JOB_TYPES } = require('../queues/emailQueue');

const getFrontendUrl = (frontendUrl) => frontendUrl || process.env.FRONTEND_URL || 'http://localhost:5173';

const queueShipmentCreatedEmail = async ({ to, trackingId, frontendUrl }) => {
  if (!to || !trackingId) return;

  await addEmailJob(EMAIL_JOB_TYPES.SHIPMENT_CREATED, {
    to,
    trackingId,
    frontendUrl: getFrontendUrl(frontendUrl),
  });
};

const queueStatusUpdateEmail = async ({ to, trackingId, status, frontendUrl }) => {
  if (!to || !trackingId || !status) return;

  await addEmailJob(EMAIL_JOB_TYPES.STATUS_UPDATED, {
    to,
    trackingId,
    status,
    frontendUrl: getFrontendUrl(frontendUrl),
  });
};

const queueShipmentReturnEmail = async ({ to, trackingId, frontendUrl }) => {
  if (!to || !trackingId) return;

  await addEmailJob(EMAIL_JOB_TYPES.SHIPMENT_RETURNED, {
    to,
    trackingId,
    frontendUrl: getFrontendUrl(frontendUrl),
  });
};

const queueAgentCredentialsEmail = async ({ to, agentName, email, password, frontendUrl }) => {
  if (!to || !agentName || !email || !password) return;

  await addEmailJob(EMAIL_JOB_TYPES.AGENT_CREDENTIALS, {
    to,
    agentName,
    email,
    password,
    frontendUrl: getFrontendUrl(frontendUrl),
  });
};

module.exports = {
  queueShipmentCreatedEmail,
  queueStatusUpdateEmail,
  queueShipmentReturnEmail,
  queueAgentCredentialsEmail,
};
