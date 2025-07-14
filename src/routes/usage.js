const express = require('express');
const { body } = require('express-validator');
const usageController = require('../controllers/usageController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Track usage
router.post('/track', [
  body('type').isIn(['call', 'sms']).withMessage('Invalid usage type'),
  body('amount').isNumeric().withMessage('Amount must be a number'),
  body('timestamp').optional().isISO8601().withMessage('Invalid timestamp')
], usageController.trackUsage);

// Get usage summary
router.get('/summary', usageController.getUsageSummary);

// Get usage history
router.get('/history', usageController.getUsageHistory);

module.exports = router;