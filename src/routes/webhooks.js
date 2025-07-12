const express = require('express');
const webhookController = require('../controllers/webhookController');
const twilioWebhookController = require('../controllers/twilioWebhookController');

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

// Twilio webhooks
router.post('/twilio/voice', twilioWebhookController.handleIncomingVoice);
router.post('/twilio/voice-answer', twilioWebhookController.handleVoiceAnswer);
router.post('/twilio/call-status', twilioWebhookController.handleCallStatus);
router.post('/twilio/voicemail', twilioWebhookController.handleVoicemail);
router.post('/twilio/transcription', twilioWebhookController.handleTranscription);
router.post('/twilio/sms', twilioWebhookController.handleIncomingSMS);
router.post('/twilio/sms-status', twilioWebhookController.handleSMSStatus);
router.post('/twilio/recording-status', twilioWebhookController.handleRecordingStatus);

// Stripe webhooks
router.post('/stripe', express.raw({ type: 'application/json' }), require('../controllers/billingController').handleStripeWebhook);

module.exports = router;