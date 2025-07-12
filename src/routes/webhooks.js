const express = require('express');
const webhookController = require('../controllers/webhookController');

const router = express.Router();

// Plivo webhooks - no authentication required but signature verification
router.post('/plivo/incoming-call', webhookController.handleIncomingCall);
router.post('/plivo/answer', webhookController.handleAnswer);
router.post('/plivo/hangup', webhookController.handleCallStatus);
router.post('/plivo/call-status', webhookController.handleCallStatus);
router.post('/plivo/voicemail', webhookController.handleVoicemail);
router.post('/plivo/transcription', webhookController.handleTranscription);
router.post('/plivo/incoming-sms', webhookController.handleIncomingSMS);
router.post('/plivo/sms-status', webhookController.handleSMSStatus);

// Stripe webhooks
router.post('/stripe', express.raw({ type: 'application/json' }), require('../controllers/billingController').handleStripeWebhook);

module.exports = router;