const twilio = require('twilio');
const { logger } = require('../middleware/logging');

class TwilioController {
  // Generate access token for Twilio Voice SDK
  async getAccessToken(req, res) {
    try {
      // Check if Twilio is configured
      if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
        return res.status(503).json({ 
          error: 'Twilio service not configured' 
        });
      }

      // Check if API Key is configured
      if (!process.env.TWILIO_API_KEY_SID || !process.env.TWILIO_API_KEY_SECRET) {
        logger.error('Twilio API keys not configured');
        return res.status(503).json({ 
          error: 'Twilio API keys not configured. Please set TWILIO_API_KEY_SID and TWILIO_API_KEY_SECRET in environment variables.' 
        });
      }

      // Create access token
      const AccessToken = twilio.jwt.AccessToken;
      const VoiceGrant = AccessToken.VoiceGrant;

      // Create a unique identity for this user
      const identity = `user-${req.userId}`;
      
      // Create access token
      const accessToken = new AccessToken(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_API_KEY_SID,
        process.env.TWILIO_API_KEY_SECRET,
        {
          identity: identity,
          ttl: 3600 // 1 hour
        }
      );

      // Create Voice grant
      const voiceGrant = new VoiceGrant({
        outgoingApplicationSid: process.env.TWILIO_TWIML_APP_SID,
        incomingAllow: true // Allow incoming calls
      });

      // Add grant to token
      accessToken.addGrant(voiceGrant);

      // Generate JWT token
      const token = accessToken.toJwt();

      logger.info(`Generated Twilio access token for user ${req.userId}`);

      res.json({
        token: token,
        identity: identity,
        ttl: 3600
      });

    } catch (error) {
      logger.error('Failed to generate Twilio access token:', error);
      res.status(500).json({ 
        error: 'Failed to generate access token' 
      });
    }
  }
}

module.exports = new TwilioController();