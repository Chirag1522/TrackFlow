require('dotenv').config();
const env = require('./src/config/env');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const http = require('http');
const socketIo = require('socket.io');

const { defaultLimiter } = require('./src/middleware/rateLimit');
const { auditMiddleware } = require('./src/utils/auditLog');
const { suspiciousActivityDetector, bruteForceTracker, validateHeaders, preventCSRF, logApiErrors, preventNoSQLInjection } = require('./src/middleware/security');

const authRoutes = require('./src/modules/auth/auth.routes');
const tenantRoutes = require('./src/modules/tenants/tenants.routes');
const userRoutes = require('./src/modules/users/users.routes');
const hubRoutes = require('./src/modules/hubs/hubs.routes');
const shipmentRoutes = require('./src/modules/shipments/shipments.routes');
const trackingRoutes = require('./src/modules/tracking/tracking.routes');
const analyticsRoutes = require('./src/modules/analytics/analytics.routes');
const subscriptionRoutes = require('./src/modules/subscriptions/subscriptions.routes');
const { initializeEmailQueue, shutdownEmailQueue } = require('./src/queues/emailQueue');

const app = express();
const server = http.createServer(app);
const isDev = env.NODE_ENV === 'development';

const normalizeOrigin = (origin) =>
  typeof origin === 'string' ? origin.trim().replace(/\/$/, '') : '';

const isLocalOrigin = (origin) => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);

const configuredFrontendOrigin = normalizeOrigin(env.FRONTEND_URL);
const allowedOrigins = new Set([configuredFrontendOrigin].filter(Boolean));

// Allow both common Vite ports when frontend URL is local.
if (configuredFrontendOrigin && isLocalOrigin(configuredFrontendOrigin)) {
  ['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174'].forEach(
    (origin) => allowedOrigins.add(origin)
  );
}

const corsOrigin = (origin, callback) => {
  if (!origin || isDev) {
    callback(null, true);
    return;
  }

  const normalizedOrigin = normalizeOrigin(origin);
  if (allowedOrigins.has(normalizedOrigin)) {
    callback(null, true);
    return;
  }

  callback(null, false);
};

// Socket.io setup
const io = socketIo(server, {
  cors: {
    origin: corsOrigin,
    methods: ['GET', 'POST'],
    credentials: false,
  },
  transports: ['websocket', 'polling'],
});

// Store io instance globally for use in routes/services
app.set('io', io);

app.use(helmet());
app.use(cors({ origin: corsOrigin, credentials: false }));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(defaultLimiter);

// ============= SECURITY MIDDLEWARE =============
app.use(auditMiddleware); // Extract IP, user agent, and user info for logging
app.use(validateHeaders); // Detect suspicious headers
app.use(preventNoSQLInjection); // Prevent NoSQL injection attacks
app.use(suspiciousActivityDetector); // Detect SQL injection, XSS, path traversal patterns
app.use(preventCSRF); // Prevent CSRF attacks
app.use(bruteForceTracker); // Track brute force attempts on auth endpoints

app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/users', userRoutes);
app.use('/api/hubs', hubRoutes);
app.use('/api/shipments', shipmentRoutes);
app.use('/api/track', trackingRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/plans', subscriptionRoutes);

app.use((err, req, res, next) => {
  logApiErrors(err, req, res, next);
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Subscribe to shipment tracking updates
  socket.on('subscribe-shipment', (trackingId) => {
    if (trackingId) {
      socket.join(`shipment:${trackingId}`);
      console.log(`Socket ${socket.id} subscribed to shipment:${trackingId}`);
    }
  });

  // Unsubscribe from shipment tracking updates
  socket.on('unsubscribe-shipment', (trackingId) => {
    if (trackingId) {
      socket.leave(`shipment:${trackingId}`);
      console.log(`Socket ${socket.id} unsubscribed from shipment:${trackingId}`);
    }
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;
initializeEmailQueue();

server.listen(PORT, () => console.log(`🚀 API running on port ${PORT}`));

const shutdown = async (signal) => {
  console.log(`Received ${signal}. Shutting down API...`);

  await shutdownEmailQueue();

  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });

  setTimeout(() => process.exit(1), 10000).unref();
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

module.exports = app;
