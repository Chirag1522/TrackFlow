const Redis = require('ioredis');

const parseBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') return fallback;

  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;

  return fallback;
};

const hasRedisConfig = Boolean(process.env.REDIS_URL || process.env.REDIS_HOST);
const redisEnabled = parseBoolean(process.env.REDIS_ENABLED, hasRedisConfig);

const getRedisBaseConfig = () => {
  if (process.env.REDIS_URL) {
    return { url: process.env.REDIS_URL };
  }

  return {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: Number(process.env.REDIS_PORT || 6379),
    password: process.env.REDIS_PASSWORD || undefined,
    db: Number(process.env.REDIS_DB || 0),
  };
};

const buildRedisClient = (overrides = {}) => {
  if (!redisEnabled) return null;

  const baseConfig = getRedisBaseConfig();
  const commonOptions = {
    maxRetriesPerRequest: null,
    enableAutoPipelining: true,
    ...overrides,
  };

  if (baseConfig.url) {
    return new Redis(baseConfig.url, commonOptions);
  }

  return new Redis({ ...baseConfig, ...commonOptions });
};

const redis = buildRedisClient();

if (redis) {
  redis.on('connect', () => {
    if (process.env.NODE_ENV !== 'test') {
      console.log('Redis client connected');
    }
  });

  redis.on('error', (error) => {
    console.error('Redis connection error:', error.message);
  });
} else if (process.env.NODE_ENV !== 'test') {
  console.warn('Redis is disabled. Set REDIS_URL or REDIS_HOST to enable cache and queues.');
}

module.exports = {
  redis,
  redisEnabled,
  buildRedisClient,
  parseBoolean,
};
