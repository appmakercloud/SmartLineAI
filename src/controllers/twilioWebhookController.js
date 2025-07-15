const { PrismaClient } = require('@prisma/client');
const twilio = require('twilio');
const { logger } = require('../middleware/logging');
const aiService = require('../services/aiService');

const prisma = new PrismaClient();

class TwilioWebhookController {
  // Verify Twilio signature
  verifySignature(req) {
    const signature = req.headers['x-twilio-signature'];
    const url = `${process.env.BASE_URL}${req.originalUrl}`;
    const params = req.body;
    
    return twilio.validateRequest(
      process.env.TWILIO_AUTH_TOKEN,
      signature,
      url,
      params
    );
  }

  // Handle incoming voice calls
  async handleIncomingVoice(req, res) {
    try {
      const { From, To, CallSid, Direction } = req.body;
      
      logger.info(`Twilio: Incoming call from ${From} to ${To}`);
      
      // Find virtual number
      const virtualNumber = await prisma.virtualNumber.findUnique({
        where: { number: To },
        include: { 
          user: {
            include: { aiSettings: true }
          }
        }
      });
      
      const twiml = new twilio.twiml.VoiceResponse();
      
      if (!virtualNumber || !virtualNumber.isActive) {
        twiml.say('This number is no longer in service.');
        twiml.hangup();
        return res.type('text/xml').send(twiml.toString());
      }
      
      // Save incoming call
      await prisma.call.create({
        data: {
          userId: virtualNumber.userId,
          numberId: virtualNumber.id,
          twilioCallSid: CallSid,
          provider: 'twilio',
          direction: 'inbound',
          fromNumber: From,
          toNumber: To,
          status: 'ringing'
        }
      });
      
      // Custom greeting
      const aiSettings = virtualNumber.user.aiSettings;
      if (aiSettings?.voiceGreeting) {
        twiml.say(aiSettings.voiceGreeting);
      } else {
        twiml.say('Hello, your call is being connected.');
      }
      
      // TODO: Send push notification to mobile app
      // For now, go to voicemail after pause
      twiml.pause({ length: 20 });
      
      // Voicemail
      twiml.say('The person you are calling is not available. Please leave a message after the beep.');
      twiml.record({
        action: '/webhooks/twilio/voicemail',
        method: 'POST',
        maxLength: 120,
        transcribe: true,
        transcribeCallback: '/webhooks/twilio/transcription',
        recordingStatusCallback: '/webhooks/twilio/recording-status'
      });
      
      res.type('text/xml').send(twiml.toString());
    } catch (error) {
      logger.error('Twilio: Incoming voice error:', error);
      res.status(500).send('Error');
    }
  }

  // Handle voice answer (for outbound calls)
  async handleVoiceAnswer(req, res) {
    try {
      const { CallSid } = req.body;
      
      logger.info(`Twilio: Call answered: ${CallSid}`);
      
      // Update call status
      await prisma.call.update({
        where: { twilioCallSid: CallSid },
        data: { status: 'answered' }
      });
      
      const twiml = new twilio.twiml.VoiceResponse();
      twiml.say('Call connected.');
      
      res.type('text/xml').send(twiml.toString());
    } catch (error) {
      logger.error('Twilio: Voice answer error:', error);
      res.status(500).send('Error');
    }
  }

  // Handle call status updates
  async handleCallStatus(req, res) {
    try {
      const { CallSid, CallStatus, CallDuration, Price } = req.body;
      
      logger.info(`Twilio: Call status update: ${CallSid} - ${CallStatus}`);
      
      const updateData = {
        status: CallStatus.toLowerCase()
      };
      
      if (CallDuration) {
        updateData.duration = parseInt(CallDuration);
      }
      
      if (Price) {
        updateData.cost = Math.abs(parseFloat(Price));
      }
      
      await prisma.call.update({
        where: { twilioCallSid: CallSid },
        data: updateData
      });
      
      res.send('OK');
    } catch (error) {
      logger.error('Twilio: Call status error:', error);
      res.status(500).send('Error');
    }
  }

  // Handle voicemail recording
  async handleVoicemail(req, res) {
    try {
      const { CallSid, RecordingSid, RecordingUrl, RecordingDuration } = req.body;
      
      logger.info(`Twilio: Voicemail recorded: ${RecordingSid}`);
      
      // Update call with recording info
      await prisma.call.update({
        where: { twilioCallSid: CallSid },
        data: {
          recordingUrl: RecordingUrl,
          duration: parseInt(RecordingDuration) || 0
        }
      });
      
      const twiml = new twilio.twiml.VoiceResponse();
      twiml.say('Thank you for your message. Goodbye.');
      twiml.hangup();
      
      res.type('text/xml').send(twiml.toString());
    } catch (error) {
      logger.error('Twilio: Voicemail error:', error);
      res.status(500).send('Error');
    }
  }

  // Handle transcription
  async handleTranscription(req, res) {
    try {
      const { CallSid, TranscriptionText, TranscriptionStatus } = req.body;
      
      if (TranscriptionStatus !== 'completed') {
        return res.send('OK');
      }
      
      logger.info(`Twilio: Transcription received for call: ${CallSid}`);
      
      // Update call with transcription
      const call = await prisma.call.update({
        where: { twilioCallSid: CallSid },
        data: { transcription: TranscriptionText },
        include: { user: true }
      });
      
      // Generate AI summary if enabled
      if (call.user.subscription !== 'free') {
        const summary = await aiService.summarizeVoicemail(TranscriptionText);
        await prisma.call.update({
          where: { id: call.id },
          data: { aiSummary: summary }
        });
      }
      
      res.send('OK');
    } catch (error) {
      logger.error('Twilio: Transcription error:', error);
      res.status(500).send('Error');
    }
  }

  // Handle incoming SMS
  async handleIncomingSMS(req, res) {
    try {
      const { From, To, Body, MessageSid, NumMedia, MediaUrl0 } = req.body;
      
      logger.info(`Twilio: Incoming SMS from ${From} to ${To}`);
      
      // Find virtual number
      const virtualNumber = await prisma.virtualNumber.findUnique({
        where: { number: To },
        include: { 
          user: {
            include: { aiSettings: true }
          }
        }
      });
      
      if (!virtualNumber || !virtualNumber.isActive) {
        return res.send('OK');
      }
      
      // Save message
      const message = await prisma.message.create({
        data: {
          userId: virtualNumber.userId,
          numberId: virtualNumber.id,
          twilioMessageSid: MessageSid,
          provider: 'twilio',
          direction: 'inbound',
          fromNumber: From,
          toNumber: To,
          content: Body,
          mediaUrls: NumMedia > 0 && MediaUrl0 ? [MediaUrl0] : [],
          status: 'received'
        }
      });
      
      // Check for auto-reply
      const aiSettings = virtualNumber.user.aiSettings;
      if (aiSettings?.smartReplyEnabled && aiSettings?.autoReplyMessage) {
        // Send auto-reply using Twilio
        const twilioService = require('../services/twilioService');
        await twilioService.sendSMS(
          To,
          From,
          aiSettings.autoReplyMessage,
          virtualNumber.userId
        );
      }
      
      // TODO: Send push notification
      
      res.send('OK');
    } catch (error) {
      logger.error('Twilio: Incoming SMS error:', error);
      res.status(500).send('Error');
    }
  }

  // Handle SMS status updates
  async handleSMSStatus(req, res) {
    try {
      const { MessageSid, MessageStatus } = req.body;
      
      logger.info(`Twilio: SMS status update: ${MessageSid} - ${MessageStatus}`);
      
      await prisma.message.update({
        where: { twilioMessageSid: MessageSid },
        data: { 
          status: MessageStatus.toLowerCase(),
          updatedAt: new Date()
        }
      });
      
      res.send('OK');
    } catch (error) {
      logger.error('Twilio: SMS status error:', error);
      res.status(500).send('Error');
    }
  }

  // Handle recording status
  async handleRecordingStatus(req, res) {
    try {
      const { CallSid, RecordingSid, RecordingUrl, RecordingStatus } = req.body;
      
      logger.info(`Twilio: Recording status: ${RecordingSid} - ${RecordingStatus}`);
      
      if (RecordingStatus === 'completed') {
        await prisma.call.update({
          where: { twilioCallSid: CallSid },
          data: { recordingUrl: RecordingUrl }
        });
      }
      
      res.send('OK');
    } catch (error) {
      logger.error('Twilio: Recording status error:', error);
      res.status(500).send('Error');
    }
  }

  // Handle voice webhook for Twilio Voice SDK
  async handleVoiceWebhook(req, res) {
    try {
      const twiml = new twilio.twiml.VoiceResponse();
      
      const { To, From, CallSid, Direction } = req.body;
      
      logger.info('Handling voice webhook for SDK', { To, From, CallSid, Direction });
      
      // For outgoing calls from the iOS app
      if (To && To !== From && Direction === 'outbound-api') {
        const dial = twiml.dial({
          callerId: From,
          timeout: 30,
          record: 'record-from-answer-dual',
          recordingStatusCallback: `${process.env.BASE_URL}/webhooks/twilio/recording-status`
        });
        
        dial.number(To);
        
        logger.info('Dialing number via SDK', { From, To });
      } else if (Direction === 'inbound') {
        // Handle incoming calls
        await this.handleIncomingVoice(req, res);
        return;
      } else {
        // Unknown call type
        twiml.say('Unable to process your call at this time.');
        twiml.hangup();
      }
      
      res.type('text/xml');
      res.send(twiml.toString());
    } catch (error) {
      logger.error('Voice webhook error:', error);
      
      const twiml = new twilio.twiml.VoiceResponse();
      twiml.say('An error occurred processing your call.');
      twiml.hangup();
      
      res.type('text/xml');
      res.send(twiml.toString());
    }
  }

  // Handle voice status callbacks from SDK calls
  async handleVoiceStatusCallback(req, res) {
    try {
      const { CallSid, CallStatus, CallDuration, Direction, From, To } = req.body;
      
      logger.info('Voice call status update', { 
        CallSid, 
        CallStatus, 
        CallDuration,
        Direction,
        From,
        To
      });
      
      // Update call record in database if it exists
      if (CallStatus === 'completed' && CallDuration) {
        try {
          const updated = await prisma.call.updateMany({
            where: { twilioCallSid: CallSid },
            data: { 
              status: 'completed',
              duration: parseInt(CallDuration) || 0,
              endedAt: new Date()
            }
          });
          
          if (updated.count > 0) {
            logger.info('Updated call record', { CallSid, duration: CallDuration });
          }
        } catch (error) {
          logger.error('Failed to update call status', error);
        }
      }
      
      res.sendStatus(200);
    } catch (error) {
      logger.error('Voice status callback error:', error);
      res.sendStatus(500);
    }
  }
}

module.exports = new TwilioWebhookController();