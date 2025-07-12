const { PrismaClient } = require('@prisma/client');
const plivo = require('plivo');
const { logger } = require('../middleware/logging');
const aiService = require('../services/aiService');

const prisma = new PrismaClient();

class WebhookController {
  // Verify Plivo signature
  verifySignature(req) {
    // Skip verification if Plivo is not configured
    if (!process.env.PLIVO_AUTH_TOKEN) {
      return true;
    }
    
    const signature = req.headers['x-plivo-signature-v2'];
    const nonce = req.headers['x-plivo-signature-v2-nonce'];
    const url = `${process.env.BASE_URL}${req.originalUrl}`;
    
    return plivo.validateV2Signature(
      req.method,
      url,
      nonce,
      process.env.PLIVO_AUTH_TOKEN,
      signature
    );
  }

  // Handle incoming calls
  async handleIncomingCall(req, res) {
    try {
      const { From, To, CallUUID, Direction } = req.body;
      
      logger.info(`Incoming call from ${From} to ${To}`);
      
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
        const response = plivo.Response();
        response.addSpeak('This number is no longer in service.');
        response.addHangup();
        return res.type('text/xml').send(response.toXML());
      }
      
      // Save incoming call
      const call = await prisma.call.create({
        data: {
          userId: virtualNumber.userId,
          numberId: virtualNumber.id,
          plivoCallId: CallUUID,
          direction: 'inbound',
          fromNumber: From,
          toNumber: To,
          status: 'ringing'
        }
      });
      
      // Create response
      const response = plivo.Response();
      
      // Check if user has custom greeting
      const aiSettings = virtualNumber.user.aiSettings;
      if (aiSettings?.voiceGreeting) {
        response.addSpeak(aiSettings.voiceGreeting);
      } else {
        response.addSpeak('Hello, your call is being connected.');
      }
      
      // TODO: Send push notification to mobile app
      // For now, go to voicemail after 20 seconds
      response.addWait({ length: 20 });
      
      // Voicemail
      response.addSpeak('The person you are calling is not available. Please leave a message after the beep.');
      response.addRecord({
        action: `${process.env.BASE_URL}/webhooks/plivo/voicemail`,
        method: 'POST',
        maxLength: 120,
        transcriptionType: 'auto',
        transcriptionUrl: `${process.env.BASE_URL}/webhooks/plivo/transcription`,
        recordingCallbackUrl: `${process.env.BASE_URL}/webhooks/plivo/recording`,
        redirect: false
      });
      
      res.type('text/xml').send(response.toXML());
    } catch (error) {
      logger.error('Incoming call error:', error);
      res.status(500).send('Error');
    }
  }

  // Handle outbound call answer
  async handleAnswer(req, res) {
    try {
      const { CallUUID, Direction, From, To } = req.body;
      
      logger.info(`Call answered: ${CallUUID}`);
      
      // Update call status
      await prisma.call.update({
        where: { plivoCallId: CallUUID },
        data: { status: 'answered' }
      });
      
      // Simple response - just connect the call
      const response = plivo.Response();
      response.addSpeak('Call connected.');
      
      res.type('text/xml').send(response.toXML());
    } catch (error) {
      logger.error('Answer webhook error:', error);
      res.status(500).send('Error');
    }
  }

  // Handle call status updates
  async handleCallStatus(req, res) {
    try {
      const { CallUUID, CallStatus, Duration, EndTime, TotalCost } = req.body;
      
      logger.info(`Call status update: ${CallUUID} - ${CallStatus}`);
      
      await prisma.call.update({
        where: { plivoCallId: CallUUID },
        data: {
          status: CallStatus.toLowerCase(),
          duration: parseInt(Duration) || 0,
          cost: parseFloat(TotalCost) || 0
        }
      });
      
      res.send('OK');
    } catch (error) {
      logger.error('Call status error:', error);
      res.status(500).send('Error');
    }
  }

  // Handle voicemail recording
  async handleVoicemail(req, res) {
    try {
      const { CallUUID, RecordingUUID, RecordingUrl, RecordingDuration } = req.body;
      
      logger.info(`Voicemail recorded: ${RecordingUUID}`);
      
      // Update call with recording info
      await prisma.call.update({
        where: { plivoCallId: CallUUID },
        data: {
          recordingUrl: RecordingUrl,
          duration: parseInt(RecordingDuration) || 0
        }
      });
      
      const response = plivo.Response();
      response.addSpeak('Thank you for your message. Goodbye.');
      response.addHangup();
      
      res.type('text/xml').send(response.toXML());
    } catch (error) {
      logger.error('Voicemail error:', error);
      res.status(500).send('Error');
    }
  }

  // Handle transcription
  async handleTranscription(req, res) {
    try {
      const { CallUUID, TranscriptionText } = req.body;
      
      logger.info(`Transcription received for call: ${CallUUID}`);
      
      // Update call with transcription
      const call = await prisma.call.update({
        where: { plivoCallId: CallUUID },
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
      logger.error('Transcription error:', error);
      res.status(500).send('Error');
    }
  }

  // Handle incoming SMS
  async handleIncomingSMS(req, res) {
    try {
      const { From, To, Text, MessageUUID, MediaUrl0 } = req.body;
      
      logger.info(`Incoming SMS from ${From} to ${To}`);
      
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
          plivoMessageId: MessageUUID,
          direction: 'inbound',
          fromNumber: From,
          toNumber: To,
          content: Text,
          mediaUrls: MediaUrl0 ? [MediaUrl0] : [],
          status: 'received'
        }
      });
      
      // Check for auto-reply
      const aiSettings = virtualNumber.user.aiSettings;
      if (aiSettings?.smartReplyEnabled && aiSettings?.autoReplyMessage) {
        // Send auto-reply
        await plivoService.sendSMS(
          To,
          From,
          aiSettings.autoReplyMessage,
          virtualNumber.userId
        );
      }
      
      // TODO: Send push notification
      
      res.send('OK');
    } catch (error) {
      logger.error('Incoming SMS error:', error);
      res.status(500).send('Error');
    }
  }

  // Handle SMS status updates
  async handleSMSStatus(req, res) {
    try {
      const { MessageUUID, Status, ErrorCode } = req.body;
      
      logger.info(`SMS status update: ${MessageUUID} - ${Status}`);
      
      await prisma.message.update({
        where: { plivoMessageId: MessageUUID },
        data: { 
          status: Status.toLowerCase(),
          updatedAt: new Date()
        }
      });
      
      res.send('OK');
    } catch (error) {
      logger.error('SMS status error:', error);
      res.status(500).send('Error');
    }
  }
}

module.exports = new WebhookController();