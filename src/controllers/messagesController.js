const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');
const voipService = require('../services/voipService');
const { logger } = require('../middleware/logging');

const prisma = new PrismaClient();

class MessagesController {
  // Send SMS
  async sendMessage(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { from, to, text } = req.body;
      
      // Verify number ownership
      const virtualNumber = await prisma.virtualNumber.findFirst({
        where: {
          number: from,
          userId: req.userId,
          isActive: true
        }
      });
      
      if (!virtualNumber) {
        return res.status(403).json({ 
          error: 'You do not own this number or it is inactive' 
        });
      }
      
      // Check credits for free users
      const user = await prisma.user.findUnique({
        where: { id: req.userId }
      });
      
      if (user.subscription === 'free' && user.credits < 1) {
        return res.status(403).json({ 
          error: 'Insufficient credits. You need at least 1 credit to send a message.' 
        });
      }
      
      // Send message using VoIP service abstraction
      const provider = virtualNumber.provider || process.env.DEFAULT_VOIP_PROVIDER || 'twilio';
      const messages = await voipService.sendSMS(from, to, text, req.userId, provider);
      
      // Deduct credits for free users
      if (user.subscription === 'free') {
        await prisma.user.update({
          where: { id: req.userId },
          data: { credits: user.credits - 1 }
        });
      }
      
      res.json({
        message: 'Message sent successfully',
        messages
      });
    } catch (error) {
      logger.error('Send message error:', error);
      res.status(500).json({ error: 'Failed to send message' });
    }
  }

  // Get message history
  async getMessageHistory(req, res) {
    try {
      const { numberId, limit = 50, offset = 0 } = req.query;
      
      const where = {
        userId: req.userId
      };
      
      if (numberId) {
        where.numberId = numberId;
      }
      
      const [messages, total] = await Promise.all([
        prisma.message.findMany({
          where,
          include: {
            number: {
              select: {
                number: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: parseInt(limit),
          skip: parseInt(offset)
        }),
        prisma.message.count({ where })
      ]);
      
      res.json({
        messages,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: total > parseInt(offset) + parseInt(limit)
        }
      });
    } catch (error) {
      logger.error('Get message history error:', error);
      res.status(500).json({ error: 'Failed to get messages' });
    }
  }

  // Get conversation with specific number
  async getConversation(req, res) {
    try {
      const { phoneNumber } = req.params;
      const { numberId } = req.query;
      
      const messages = await prisma.message.findMany({
        where: {
          userId: req.userId,
          numberId: numberId,
          OR: [
            { fromNumber: phoneNumber },
            { toNumber: phoneNumber }
          ]
        },
        orderBy: {
          createdAt: 'asc'
        }
      });
      
      res.json({ messages });
    } catch (error) {
      logger.error('Get conversation error:', error);
      res.status(500).json({ error: 'Failed to get conversation' });
    }
  }

  // Mark messages as read
  async markAsRead(req, res) {
    try {
      const { messageIds } = req.body;
      
      // Verify ownership
      const messages = await prisma.message.findMany({
        where: {
          id: { in: messageIds },
          userId: req.userId
        }
      });
      
      if (messages.length !== messageIds.length) {
        return res.status(403).json({ error: 'Invalid message IDs' });
      }
      
      // Update read status (you might want to add a 'read' field to the schema)
      // For now, just return success
      
      res.json({ message: 'Messages marked as read' });
    } catch (error) {
      logger.error('Mark as read error:', error);
      res.status(500).json({ error: 'Failed to mark messages as read' });
    }
  }
}

module.exports = new MessagesController();