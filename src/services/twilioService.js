const twilio = require('twilio');
const { PrismaClient } = require('@prisma/client');
const { logger } = require('../middleware/logging');

const prisma = new PrismaClient();

class TwilioService {
  constructor() {
    // Only initialize client if credentials are provided
    this.client = null;
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
    }
  }

  // Search available numbers
  async searchNumbers(countryCode = 'US', type = 'local', pattern = null, areaCode = null) {
    if (!this.client) {
      throw new Error('Twilio client not configured');
    }
    
    try {
      const params = {
        limit: 20
      };
      
      // Map type to Twilio parameters
      if (type === 'local') {
        params.voiceEnabled = true;
        params.smsEnabled = true;
      } else if (type === 'tollfree') {
        params.tollFree = true;
      } else if (type === 'mobile') {
        params.mmsEnabled = true;
        params.smsEnabled = true;
      }
      
      if (pattern) {
        params.contains = pattern;
      }
      
      // Add area code filter if provided
      if (areaCode) {
        params.areaCode = areaCode;
        logger.info(`Twilio: Filtering by area code ${areaCode}`);
      }
      
      logger.info('Twilio search params:', params);
      
      let numbers;
      if (countryCode === 'US') {
        numbers = await this.client.availablePhoneNumbers('US').local.list(params);
      } else if (countryCode === 'GB') {
        numbers = await this.client.availablePhoneNumbers('GB').local.list(params);
      } else if (countryCode === 'CA') {
        numbers = await this.client.availablePhoneNumbers('CA').local.list(params);
      }
      
      logger.info(`Twilio: Found ${numbers.length} numbers`);
      if (numbers.length > 0) {
        logger.info(`Twilio: First number: ${numbers[0].phoneNumber}`);
      }
      
      // Map to our format
      return numbers.map(number => ({
        phoneNumber: number.phoneNumber,  // Changed from 'number' to 'phoneNumber'
        monthlyRate: 1.15, // Twilio standard rate
        type: type,
        features: {
          sms: number.capabilities.sms,
          voice: number.capabilities.voice,
          mms: number.capabilities.mms
        }
      }));
    } catch (error) {
      logger.error('Twilio: Error searching numbers:', error);
      throw new Error('Failed to search numbers');
    }
  }

  // Buy a number for user
  async buyNumber(number, userId) {
    try {
      // Check user
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });
      
      if (!user) {
        throw new Error('User not found');
      }
      
      // Purchase from Twilio
      const purchasedNumber = await this.client.incomingPhoneNumbers.create({
        phoneNumber: number,
        voiceUrl: `${process.env.BASE_URL}/webhooks/twilio/voice`,
        voiceMethod: 'POST',
        smsUrl: `${process.env.BASE_URL}/webhooks/twilio/sms`,
        smsMethod: 'POST',
        statusCallback: `${process.env.BASE_URL}/webhooks/twilio/status`,
        statusCallbackMethod: 'POST'
      });
      
      // Save to database with Twilio SID
      const virtualNumber = await prisma.virtualNumber.create({
        data: {
          userId,
          number: purchasedNumber.phoneNumber,
          countryCode: number.substring(1, 3),
          type: user.subscription === 'free' ? 'temporary' : 'permanent',
          expiresAt: user.subscription === 'free' 
            ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
            : null,
          provider: 'twilio',
          providerNumberId: purchasedNumber.sid
        }
      });
      
      logger.info(`Twilio: Number ${number} purchased for user ${userId}`);
      return virtualNumber;
    } catch (error) {
      logger.error('Twilio: Error buying number:', error);
      throw new Error('Failed to purchase number');
    }
  }

  // Release a number
  async releaseNumber(number, userId) {
    try {
      // Verify ownership
      const virtualNumber = await prisma.virtualNumber.findFirst({
        where: {
          number,
          userId,
          provider: 'twilio'
        }
      });
      
      if (!virtualNumber) {
        throw new Error('Number not found or unauthorized');
      }
      
      // Release from Twilio
      if (virtualNumber.providerNumberId) {
        await this.client.incomingPhoneNumbers(virtualNumber.providerNumberId).remove();
      }
      
      // Mark as inactive in database
      await prisma.virtualNumber.update({
        where: { id: virtualNumber.id },
        data: { isActive: false }
      });
      
      logger.info(`Twilio: Number ${number} released for user ${userId}`);
      return { success: true };
    } catch (error) {
      logger.error('Twilio: Error releasing number:', error);
      throw new Error('Failed to release number');
    }
  }

  // Make outbound call
  async makeCall(from, to, userId) {
    try {
      // Validate number ownership
      const virtualNumber = await prisma.virtualNumber.findFirst({
        where: {
          number: from,
          userId,
          isActive: true,
          provider: 'twilio'
        }
      });
      
      if (!virtualNumber) {
        throw new Error('Invalid or inactive number');
      }
      
      // Create call with Twilio
      const call = await this.client.calls.create({
        url: `${process.env.BASE_URL}/webhooks/twilio/voice-answer`,
        to: to,
        from: from,
        statusCallback: `${process.env.BASE_URL}/webhooks/twilio/call-status`,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        record: true,
        recordingStatusCallback: `${process.env.BASE_URL}/webhooks/twilio/recording-status`
      });
      
      // Save call record
      const callRecord = await prisma.call.create({
        data: {
          userId,
          numberId: virtualNumber.id,
          twilioCallSid: call.sid,
          direction: 'outbound',
          fromNumber: from,
          toNumber: to,
          status: 'initiated',
          provider: 'twilio'
        }
      });
      
      logger.info(`Twilio: Outbound call initiated: ${callRecord.id}`);
      return {
        callId: callRecord.id,
        twilioCallSid: call.sid,
        status: 'initiated'
      };
    } catch (error) {
      logger.error('Twilio: Error making call:', error);
      throw new Error('Failed to initiate call');
    }
  }

  // Send SMS
  async sendSMS(from, to, text, userId) {
    try {
      // Validate number ownership
      const virtualNumber = await prisma.virtualNumber.findFirst({
        where: {
          number: from,
          userId,
          isActive: true,
          provider: 'twilio'
        }
      });
      
      if (!virtualNumber) {
        throw new Error('Invalid or inactive number');
      }
      
      // Send with Twilio
      const message = await this.client.messages.create({
        body: text,
        from: from,
        to: to,
        statusCallback: `${process.env.BASE_URL}/webhooks/twilio/sms-status`
      });
      
      // Save message
      const savedMessage = await prisma.message.create({
        data: {
          userId,
          numberId: virtualNumber.id,
          twilioMessageSid: message.sid,
          direction: 'outbound',
          fromNumber: from,
          toNumber: to,
          content: text,
          status: 'sent',
          cost: 0.0079, // Twilio standard rate
          provider: 'twilio'
        }
      });
      
      logger.info(`Twilio: SMS sent from ${from} to ${to}`);
      return [savedMessage];
    } catch (error) {
      logger.error('Twilio: Error sending SMS:', error);
      throw new Error('Failed to send message');
    }
  }

  // Get call recording
  async getRecording(callId) {
    try {
      const call = await prisma.call.findUnique({
        where: { id: callId }
      });
      
      if (!call || !call.twilioCallSid) {
        throw new Error('Call not found');
      }
      
      // Get recordings from Twilio
      const recordings = await this.client.recordings.list({
        callSid: call.twilioCallSid,
        limit: 1
      });
      
      if (recordings.length === 0) {
        throw new Error('Recording not found');
      }
      
      const recording = recordings[0];
      return {
        url: `https://api.twilio.com${recording.uri.replace('.json', '.mp3')}`,
        duration: recording.duration,
        format: 'mp3'
      };
    } catch (error) {
      logger.error('Twilio: Error getting recording:', error);
      throw new Error('Failed to get recording');
    }
  }

  // Get transcription
  async getTranscription(recordingSid) {
    try {
      const transcriptions = await this.client.transcriptions.list({
        recordingSid: recordingSid,
        limit: 1
      });
      
      if (transcriptions.length > 0) {
        return transcriptions[0].transcriptionText;
      }
      
      return null;
    } catch (error) {
      logger.error('Twilio: Error getting transcription:', error);
      return null;
    }
  }
}

module.exports = new TwilioService();