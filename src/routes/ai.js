const express = require('express');
const { body } = require('express-validator');
const aiController = require('../controllers/aiController');
const { authenticate, requirePremium } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get AI settings
router.get('/settings', aiController.getSettings);

// Update AI settings
router.patch('/settings', [
  body('voicemailEnabled').optional().isBoolean(),
  body('transcriptionEnabled').optional().isBoolean(),
  body('smartReplyEnabled').optional().isBoolean(),
  body('autoReplyMessage').optional().isString().isLength({ max: 500 }),
  body('voiceGreeting').optional().isString().isLength({ max: 500 })
], aiController.updateSettings);

// Generate smart reply (premium)
router.post('/smart-reply', requirePremium, [
  body('message').notEmpty().withMessage('Message required'),
  body('context').optional().isString()
], aiController.generateSmartReply);

// Summarize call (premium)
router.post('/summarize-call', requirePremium, [
  body('callId').isUUID().withMessage('Valid call ID required')
], aiController.summarizeCall);

// Get insights (premium)
router.get('/insights', requirePremium, aiController.getInsights);

module.exports = router;