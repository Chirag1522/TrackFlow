const { Queue, Worker } = require('bullmq');
const { buildRedisClient, parseBoolean, redisEnabled } = require('../config/redis');
const { shipmentCreatedEmail, statusUpdateEmail, shipmentReturnEmail, agentCredentialsEmail } = require('../utils/sendEmail');

const EMAIL_QUEUE_NAME = 'email-notifications';

const EMAIL_JOB_TYPES = {
  SHIPMENT_CREATED: 'shipment.created',
  STATUS_UPDATED: 'shipment.status_updated',
  SHIPMENT_RETURNED: 'shipment.returned',
  AGENT_CREDENTIALS: 'agent.credentials',
};

const queuesEnabled = parseBoolean(process.env.QUEUES_ENABLED, true) && redisEnabled;

let emailQueue = null;
let emailWorker = null;

const processEmailJob = async ({ name, data }) => {
  switch (name) {
    case EMAIL_JOB_TYPES.SHIPMENT_CREATED:
      await shipmentCreatedEmail(data.to, data.trackingId, data.frontendUrl, { throwOnError: true });
      return;

    case EMAIL_JOB_TYPES.STATUS_UPDATED:
      await statusUpdateEmail(data.to, data.trackingId, data.status, data.frontendUrl, { throwOnError: true });
      return;

    case EMAIL_JOB_TYPES.SHIPMENT_RETURNED:
      await shipmentReturnEmail(data.to, data.trackingId, data.frontendUrl, { throwOnError: true });
      return;

    case EMAIL_JOB_TYPES.AGENT_CREDENTIALS:
      await agentCredentialsEmail(data.to, data.agentName, data.email, data.password, data.frontendUrl, { throwOnError: true });
      return;

    default:
      throw new Error(`Unsupported email job type: ${name}`);
  }
};

const runInlineFallback = (jobName, payload) => {
  setImmediate(() => {
    processEmailJob({ name: jobName, data: payload }).catch((error) => {
      console.error(`Inline email fallback failed for ${jobName}:`, error.message);
    });
  });
};

const initializeEmailQueue = () => {
  if (!queuesEnabled) {
    if (process.env.NODE_ENV !== 'test') {
      console.warn('Email queue disabled. Emails will be sent via inline fallback.');
    }
    return;
  }

  if (emailQueue) return;

  try {
    const queueConnection = buildRedisClient();
    const workerConnection = buildRedisClient();

    emailQueue = new Queue(EMAIL_QUEUE_NAME, {
      connection: queueConnection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 1000,
        removeOnFail: 1000,
      },
    });

    emailWorker = new Worker(
      EMAIL_QUEUE_NAME,
      async (job) => processEmailJob(job),
      {
        connection: workerConnection,
        concurrency: Number(process.env.EMAIL_QUEUE_CONCURRENCY || 4),
      }
    );

    emailWorker.on('failed', (job, error) => {
      console.error(`Email job failed (${job?.name || 'unknown'}):`, error.message);
    });

    if (process.env.NODE_ENV !== 'test') {
      console.log('Email queue initialized');
    }
  } catch (error) {
    console.error('Failed to initialize email queue:', error.message);
    emailQueue = null;
    emailWorker = null;
  }
};

const addEmailJob = async (jobName, payload, options = {}) => {
  if (!payload?.to) return;

  if (!queuesEnabled) {
    runInlineFallback(jobName, payload);
    return;
  }

  if (!emailQueue) {
    initializeEmailQueue();
  }

  if (!emailQueue) {
    runInlineFallback(jobName, payload);
    return;
  }

  try {
    await emailQueue.add(jobName, payload, options);
  } catch (error) {
    console.error(`Failed to enqueue email job ${jobName}:`, error.message);
    runInlineFallback(jobName, payload);
  }
};

const shutdownEmailQueue = async () => {
  const closers = [];

  if (emailWorker) closers.push(emailWorker.close());
  if (emailQueue) closers.push(emailQueue.close());

  await Promise.allSettled(closers);
  emailWorker = null;
  emailQueue = null;
};

module.exports = {
  EMAIL_JOB_TYPES,
  initializeEmailQueue,
  addEmailJob,
  shutdownEmailQueue,
};
