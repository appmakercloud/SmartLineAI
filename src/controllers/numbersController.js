const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');
const voipService = require('../services/voipService');
const { logger } = require('../middleware/logging');

const prisma = new PrismaClient();

class NumbersController {
  // Search available numbers
  async searchNumbers(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { country = 'US', type = 'local', pattern, areaCode, provider } = req.query;
      
      const numbers = await voipService.searchNumbers(country, type, pattern, areaCode, provider);
      
      res.json({
        country,
        type,
        total: numbers.length,
        numbers: numbers.slice(0, 20) // Limit to 20 results
      });
    } catch (error) {
      logger.error('Search numbers error:', error);
      res.status(500).json({ error: 'Failed to search numbers' });
    }
  }

  // Get user's numbers
  async getMyNumbers(req, res) {
    try {
      const numbers = await prisma.virtualNumber.findMany({
        where: {
          userId: req.userId,
          isActive: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      
      res.json({ numbers });
    } catch (error) {
      logger.error('Get numbers error:', error);
      res.status(500).json({ error: 'Failed to get numbers' });
    }
  }

  // Buy a number
  async buyNumber(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { number, provider } = req.body;
      
      // Check user's subscription and limits
      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        include: {
          numbers: {
            where: { isActive: true }
          }
        }
      });
      
      // Check number limits based on subscription
      const limits = {
        free: 1,
        starter: 1,
        professional: 3,
        business: 10
      };
      
      const limit = limits[user.subscription] || 1;
      
      if (user.numbers.length >= limit) {
        return res.status(403).json({ 
          error: `Your ${user.subscription} plan allows only ${limit} number(s)` 
        });
      }
      
      // Check if user has credits for free plan
      if (user.subscription === 'free' && user.credits < 5) {
        return res.status(403).json({ 
          error: 'Insufficient credits. You need at least 5 credits to get a number.' 
        });
      }
      
      // Buy the number
      const virtualNumber = await voipService.buyNumber(number, req.userId, provider);
      
      // Deduct credits for free users
      if (user.subscription === 'free') {
        await prisma.user.update({
          where: { id: req.userId },
          data: { credits: user.credits - 5 }
        });
      }
      
      // Log transaction
      await prisma.transaction.create({
        data: {
          userId: req.userId,
          type: 'number_purchase',
          amount: user.subscription === 'free' ? 0 : 0.80,
          currency: 'USD',
          status: 'completed',
          description: `Purchased number ${number}`
        }
      });
      
      res.status(201).json({
        message: 'Number purchased successfully',
        number: virtualNumber
      });
    } catch (error) {
      logger.error('Buy number error:', error);
      res.status(500).json({ error: 'Failed to purchase number' });
    }
  }

  // Release a number
  async releaseNumber(req, res) {
    try {
      const { numberId } = req.params;
      
      // Get number details
      const virtualNumber = await prisma.virtualNumber.findFirst({
        where: {
          id: numberId,
          userId: req.userId,
          isActive: true
        }
      });
      
      if (!virtualNumber) {
        return res.status(404).json({ error: 'Number not found' });
      }
      
      // Release from VoIP provider
      await voipService.releaseNumber(virtualNumber.number, req.userId, virtualNumber.provider);
      
      res.json({ message: 'Number released successfully' });
    } catch (error) {
      logger.error('Release number error:', error);
      res.status(500).json({ error: 'Failed to release number' });
    }
  }

  // Update number settings
  async updateNumberSettings(req, res) {
    try {
      const { numberId } = req.params;
      const { autoReply, voicemailGreeting } = req.body;
      
      // Verify ownership
      const virtualNumber = await prisma.virtualNumber.findFirst({
        where: {
          id: numberId,
          userId: req.userId,
          isActive: true
        }
      });
      
      if (!virtualNumber) {
        return res.status(404).json({ error: 'Number not found' });
      }
      
      // Update AI settings
      if (autoReply !== undefined || voicemailGreeting !== undefined) {
        await prisma.aISettings.update({
          where: { userId: req.userId },
          data: {
            ...(autoReply !== undefined && { smartReplyEnabled: autoReply }),
            ...(voicemailGreeting && { voiceGreeting: voicemailGreeting })
          }
        });
      }
      
      res.json({ message: 'Settings updated successfully' });
    } catch (error) {
      logger.error('Update settings error:', error);
      res.status(500).json({ error: 'Failed to update settings' });
    }
  }
}

module.exports = new NumbersController();