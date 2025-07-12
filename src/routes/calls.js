const express = require('express');
const { body, query } = require('express-validator');
const callsController = require('../controllers/callsController');
const { authenticate, requirePremium } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Make a call
router.post('/dial', [
  body('from').isMobilePhone().withMessage('Invalid from number'),
  body('to').isMobilePhone().withMessage('Invalid to number')
], callsController.makeCall);

// Get call history
router.get('/history', [
  query('numberId').optional().isUUID(),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('offset').optional().isInt({ min: 0 })
], callsController.getCallHistory);

// Get call details
router.get('/:callId', callsController.getCallDetails);

// Get call recording (premium feature)
router.get('/:callId/recording', requirePremium, callsController.getRecording);

// Get call transcription (premium feature)
router.get('/:callId/transcription', requirePremium, callsController.getTranscription);

// End active call
router.post('/:callId/end', callsController.endCall);

module.exports = router;