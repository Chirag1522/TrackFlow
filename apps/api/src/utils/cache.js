const { redis, redisEnabled, parseBoolean } = require('../config/redis');

const cacheEnabled = parseBoolean(process.env.CACHE_ENABLED, true) && redisEnabled;
const defaultTtlSeconds = Number(process.env.CACHE_TTL_SECONDS || 45);

const isCacheAvailable = () => cacheEnabled && redis;

const withCacheSafety = async (handler, fallbackValue = null) => {
  if (!isCacheAvailable()) return fallbackValue;

  try {
    return await handler();
  } catch (error) {
    console.error('Cache operation failed:', error.message);
    return fallbackValue;
  }
};

const getJSON = async (key) => withCacheSafety(async () => {
  const cached = await redis.get(key);
  if (cached == null) return null;
  return JSON.parse(cached);
}, null);

const setJSON = async (key, value, ttlSeconds = defaultTtlSeconds) => withCacheSafety(async () => {
  const payload = JSON.stringify(value);
  if (ttlSeconds > 0) {
    await redis.set(key, payload, 'EX', ttlSeconds);
    return true;
  }

  await redis.set(key, payload);
  return true;
}, false);

const getOrSetJSON = async (key, ttlSeconds, resolver) => {
  const cachedValue = await getJSON(key);
  if (cachedValue !== null) {
    return cachedValue;
  }

  const freshValue = await resolver();
  setJSON(key, freshValue, ttlSeconds).catch(() => {});
  return freshValue;
};

const deleteKeys = async (...keys) => withCacheSafety(async () => {
  const filteredKeys = keys.filter(Boolean);
  if (filteredKeys.length === 0) return 0;
  return redis.del(...filteredKeys);
}, 0);

const deleteByPattern = async (pattern) => withCacheSafety(async () => {
  let cursor = '0';
  let deletedCount = 0;

  do {
    const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 200);
    cursor = nextCursor;

    if (keys.length > 0) {
      deletedCount += await redis.del(...keys);
    }
  } while (cursor !== '0');

  return deletedCount;
}, 0);

module.exports = {
  cacheEnabled,
  defaultTtlSeconds,
  getJSON,
  setJSON,
  getOrSetJSON,
  deleteKeys,
  deleteByPattern,
};
