const rateLimit = require('express-rate-limit');

const isDev = process.env.NODE_ENV === 'development';
const disableRateLimit = ['1', 'true', 'yes', 'on'].includes(
  String(process.env.DISABLE_RATE_LIMIT || '').trim().toLowerCase()
);

const defaultLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 1000 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
  skip: () => disableRateLimit,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 1000 : 20,
  message: { error: 'Too many authentication attempts, please try again later.' },
  skip: () => disableRateLimit,
});

const trackingLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: isDev ? 1000 : 30,
  message: { error: 'Too many tracking requests, please try again later.' },
  skip: () => disableRateLimit,
});

module.exports = { defaultLimiter, authLimiter, trackingLimiter };
