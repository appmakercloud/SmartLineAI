const plivo = require('plivo');
const { PrismaClient } = require('@prisma/client');
const { logger } = require('../middleware/logging');

const prisma = new PrismaClient();

// Only initialize client if credentials are provided
let client = null;
if (process.env.PLIVO_AUTH_ID && process.env.PLIVO_AUTH_TOKEN) {
  client = new plivo.Client(
    process.env.PLIVO_AUTH_ID,
    process.env.PLIVO_AUTH_TOKEN
  );
}

class PlivoService {
  // Search available numbers
  async searchNumbers(countryCode = 'US', type = 'local', pattern = null) {
    if (!client) {
      throw new Error('Plivo client not configured');
    }
    
    try {
      const params = {
        type: type,
        limit: 20
      };
      
      if (pattern) {
        params.pattern = pattern;
      }
      
      const response = await client.numbers.search(countryCode, params);
      
      // Map to our format
      return response.objects.map(number => ({
        number: number.number,
        monthlyRate: number.monthly_rental_rate,
        type: number.type,
        features: {
          sms: number.sms_enabled,
          voice: number.voice_enabled,
          mms: number.mms_enabled
        }
      }));
    } catch (error) {
      logger.error('Error searching numbers:', error);
      throw new Error('Failed to search numbers');
    }
  }

  // Buy a number for user
  async buyNumber(number, userId) {
    try {
      // Check user credits/subscription
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });
      
      if (!user) {
        throw new Error('User not found');
      }
      
      // Purchase from Plivo
      await client.numbers.buy(number);
      
      // Configure number to point to our webhooks
      await client.numbers.update(number, {
        appId: process.env.PLIVO_APP_ID
      });
      
      // Save to database
      const virtualNumber = await prisma.virtualNumber.create({
        data: {
          userId,
          number,
          countryCode: number.substring(1, 3),
          type: user.subscription === 'free' ? 'temporary' : 'permanent',
          expiresAt: user.subscription === 'free' 
            ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
            : null
        }
      });
      
      logger.info(`Number ${number} purchased for user ${userId}`);
      return virtualNumber;
    } catch (error) {
      logger.error('Error buying number:', error);
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
          userId
        }
      });
      
      if (!virtualNumber) {
        throw new Error('Number not found or unauthorized');
      }
      
      // Release from Plivo
      await client.numbers.unlink(number);
      
      // Mark as inactive in database
      await prisma.virtualNumber.update({
        where: { id: virtualNumber.id },
        data: { isActive: false }
      });
      
      logger.info(`Number ${number} released for user ${userId}`);
      return { success: true };
    } catch (error) {
      logger.error('Error releasing number:', error);
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
          isActive: true
        }
      });
      
      if (!virtualNumber) {
        throw new Error('Invalid or inactive number');
      }
      
      // Create call with Plivo
      const response = await client.calls.create(
        from,
        to,
        `${process.env.BASE_URL}/webhooks/plivo/answer`,
        {
          answerMethod: 'POST',
          ringUrl: `${process.env.BASE_URL}/webhooks/plivo/ring`,
          hangupUrl: `${process.env.BASE_URL}/webhooks/plivo/hangup`,
          machineDetection: true,
          machineDetectionUrl: `${process.env.BASE_URL}/webhooks/plivo/machine`
        }
      );
      
      // Save call record
      const call = await prisma.call.create({
        data: {
          userId,
          numberId: virtualNumber.id,
          plivoCallId: response.requestUuid,
          direction: 'outbound',
          fromNumber: from,
          toNumber: to,
          status: 'initiated'
        }
      });
      
      logger.info(`Outbound call initiated: ${call.id}`);
      return {
        callId: call.id,
        plivoCallId: response.requestUuid,
        status: 'initiated'
      };
    } catch (error) {
      logger.error('Error making call:', error);
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
          isActive: true
        }
      });
      
      if (!virtualNumber) {
        throw new Error('Invalid or inactive number');
      }
      
      // Check message length and split if needed
      const messages = this.splitSMS(text);
      const results = [];
      
      for (const message of messages) {
        const response = await client.messages.create({
          src: from,
          dst: to,
          text: message,
          url: `${process.env.BASE_URL}/webhooks/plivo/sms-status`,
          method: 'POST'
        });
        
        // Save message
        const savedMessage = await prisma.message.create({
          data: {
            userId,
            numberId: virtualNumber.id,
            plivoMessageId: response.messageUuid[0],
            direction: 'outbound',
            fromNumber: from,
            toNumber: to,
            content: message,
            status: 'sent',
            cost: 0.0050 // Update with actual cost
          }
        });
        
        results.push(savedMessage);
      }
      
      logger.info(`SMS sent from ${from} to ${to}`);
      return results;
    } catch (error) {
      logger.error('Error sending SMS:', error);
      throw new Error('Failed to send message');
    }
  }

  // Helper to split long SMS
  splitSMS(text, maxLength = 160) {
    const messages = [];
    let currentMessage = '';
    
    const words = text.split(' ');
    for (const word of words) {
      if (currentMessage.length + word.length + 1 > maxLength) {
        messages.push(currentMessage.trim());
        currentMessage = word;
      } else {
        currentMessage += (currentMessage ? ' ' : '') + word;
      }
    }
    
    if (currentMessage) {
      messages.push(currentMessage.trim());
    }
    
    return messages;
  }

  // Get call recording
  async getRecording(callId) {
    try {
      const call = await prisma.call.findUnique({
        where: { id: callId }
      });
      
      if (!call || !call.recordingUrl) {
        throw new Error('Recording not found');
      }
      
      // Get recording from Plivo
      const recording = await client.recordings.get(call.plivoCallId);
      return {
        url: recording.recordingUrl,
        duration: recording.recordingDuration,
        format: recording.recordingFormat
      };
    } catch (error) {
      logger.error('Error getting recording:', error);
      throw new Error('Failed to get recording');
    }
  }
}

module.exports = new PlivoService();