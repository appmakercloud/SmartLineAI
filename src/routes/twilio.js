const express = require('express');
const twilioController = require('../controllers/twilioController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get Twilio access token for Voice SDK
router.get('/access-token', twilioController.getAccessToken);

module.exports = router;