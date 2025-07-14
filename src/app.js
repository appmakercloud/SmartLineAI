require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { logger, requestLogger } = require('./middleware/logging');
const errorHandler = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/auth');
const numberRoutes = require('./routes/numbers');
const callRoutes = require('./routes/calls');
const messageRoutes = require('./routes/messages');
const webhookRoutes = require('./routes/webhooks');
const billingRoutes = require('./routes/billing');
const aiRoutes = require('./routes/ai');
const subscriptionRoutes = require('./routes/subscriptions');
const usageRoutes = require('./routes/usage');
// const stripeTestRoutes = require('./routes/stripe-test');

const app = express();

// Trust proxy for Render.com (specific number for security)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = process.env.NODE_ENV === 'production' 
      ? ['https://smartlineai.com', 'https://app.smartlineai.com']
      : ['http://localhost:3000', 'http://localhost:8100', 'http://localhost:8081'];
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all origins for now (mobile app compatibility)
    }
  },
  credentials: true
}));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use(requestLogger);

// Rate limiting with Render-specific configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting in development
  skip: (req) => process.env.NODE_ENV === 'development',
  // Use custom key generator for Render
  keyGenerator: (req) => {
    // Use X-Forwarded-For header from Render's proxy
    return req.headers['x-forwarded-for']?.split(',')[0] || req.ip;
  }
});

const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50, // Increased to 50 for testing
  message: 'Too many attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'development',
  keyGenerator: (req) => {
    return req.headers['x-forwarded-for']?.split(',')[0] || req.ip;
  }
});

// Health check endpoints
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'SmartLine AI',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// Render.com expects health check at /api/health
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'SmartLine AI',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    uptime: process.uptime()
  });
});

// API routes with rate limiting
app.use('/api/auth/register', strictLimiter);
app.use('/api/auth/login', strictLimiter);
app.use('/api/', limiter);

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/numbers', numberRoutes);
app.use('/api/calls', callRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/usage', usageRoutes);
// app.use('/api/stripe-test', stripeTestRoutes);

// Webhook routes (no rate limiting)
app.use('/webhooks', webhookRoutes);

// Error handling
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  logger.info(`SmartLine AI server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);
  
  // Start cron jobs
  const cronService = require('./services/cronService');
  cronService.start();
});