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

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://smartlineai.com', 'https://app.smartlineai.com']
    : ['http://localhost:3000', 'http://localhost:8100'],
  credentials: true
}));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use(requestLogger);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});

const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many attempts, please try again later.'
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'SmartLine AI',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
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
});