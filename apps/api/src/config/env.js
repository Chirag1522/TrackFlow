const Joi = require('joi');
require('dotenv').config();

const envSchema = Joi.object({
  DATABASE_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().min(16).required(),
  JWT_REFRESH_SECRET: Joi.string().min(16).required(),
  JWT_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
  CLOUDINARY_CLOUD_NAME: Joi.string().required(),
  CLOUDINARY_API_KEY: Joi.string().required(),
  CLOUDINARY_API_SECRET: Joi.string().required(),
  EMAIL_FROM: Joi.string().email().required(),
  PORT: Joi.number().default(5000),
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  FRONTEND_URL: Joi.string().uri().required(),
  DISABLE_RATE_LIMIT: Joi.boolean().truthy('1').truthy('true').falsy('0').falsy('false').default(false),
  RESEND_API_KEY: Joi.string().allow('').optional(),
  REDIS_ENABLED: Joi.boolean().truthy('1').truthy('true').falsy('0').falsy('false').default(true),
  REDIS_URL: Joi.string().allow('').optional(),
  REDIS_HOST: Joi.string().default('127.0.0.1'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').optional(),
  REDIS_DB: Joi.number().default(0),
  CACHE_ENABLED: Joi.boolean().truthy('1').truthy('true').falsy('0').falsy('false').default(true),
  CACHE_TTL_SECONDS: Joi.number().default(45),
  CACHE_ANALYTICS_TTL_SECONDS: Joi.number().default(60),
  CACHE_TRACKING_TTL_SECONDS: Joi.number().default(30),
  CACHE_SHIPMENTS_TTL_SECONDS: Joi.number().default(20),
  CACHE_WORKITEMS_TTL_SECONDS: Joi.number().default(15),
  CACHE_AVAILABLE_AGENTS_TTL_SECONDS: Joi.number().default(30),
  QUEUES_ENABLED: Joi.boolean().truthy('1').truthy('true').falsy('0').falsy('false').default(true),
  EMAIL_QUEUE_CONCURRENCY: Joi.number().default(4),
}).unknown(true);

const { error, value: env } = envSchema.validate(process.env);

if (error) {
  console.error('❌ Invalid environment variables:', error.message);
  process.exit(1);
}

module.exports = env;
