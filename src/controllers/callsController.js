const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');
const voipService = require('../services/voipService');
const { logger } = require('../middleware/logging');

const prisma = new PrismaClient();

class CallsController {
  // Make a call
  async makeCall(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { from, to } = req.body;
      
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
      
      // Check user credits
      const user = await prisma.user.findUnique({
        where: { id: req.userId }
      });
      
      if (user.subscription === 'free' && user.credits < 1) {
        return res.status(403).json({ 
          error: 'Insufficient credits. You need at least 1 credit to make a call.' 
        });
      }
      
      // Make the call using the number's provider
      const callInfo = await voipService.makeCall(from, to, req.userId, virtualNumber.provider);
      
      res.json({
        message: 'Call initiated',
        call: callInfo
      });
    } catch (error) {
      logger.error('Make call error:', error);
      res.status(500).json({ error: 'Failed to make call' });
    }
  }

  // Get call history
  async getCallHistory(req, res) {
    try {
      const { numberId, limit = 50, offset = 0 } = req.query;
      
      const where = {
        userId: req.userId
      };
      
      if (numberId) {
        where.numberId = numberId;
      }
      
      const [calls, total] = await Promise.all([
        prisma.call.findMany({
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
        prisma.call.count({ where })
      ]);
      
      res.json({
        calls,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: total > parseInt(offset) + parseInt(limit)
        }
      });
    } catch (error) {
      logger.error('Get call history error:', error);
      res.status(500).json({ error: 'Failed to get call history' });
    }
  }

  // Get call details
  async getCallDetails(req, res) {
    try {
      const { callId } = req.params;
      
      const call = await prisma.call.findFirst({
        where: {
          id: callId,
          userId: req.userId
        },
        include: {
          number: true
        }
      });
      
      if (!call) {
        return res.status(404).json({ error: 'Call not found' });
      }
      
      res.json({ call });
    } catch (error) {
      logger.error('Get call details error:', error);
      res.status(500).json({ error: 'Failed to get call details' });
    }
  }

  // Get recording
  async getRecording(req, res) {
    try {
      const { callId } = req.params;
      
      // Verify ownership
      const call = await prisma.call.findFirst({
        where: {
          id: callId,
          userId: req.userId
        }
      });
      
      if (!call) {
        return res.status(404).json({ error: 'Call not found' });
      }
      
      if (!call.recordingUrl) {
        return res.status(404).json({ error: 'No recording available' });
      }
      
      const recording = await voipService.getRecording(callId, call.provider);
      
      res.json({ recording });
    } catch (error) {
      logger.error('Get recording error:', error);
      res.status(500).json({ error: 'Failed to get recording' });
    }
  }

  // Get transcription
  async getTranscription(req, res) {
    try {
      const { callId } = req.params;
      
      const call = await prisma.call.findFirst({
        where: {
          id: callId,
          userId: req.userId
        },
        select: {
          transcription: true,
          aiSummary: true
        }
      });
      
      if (!call) {
        return res.status(404).json({ error: 'Call not found' });
      }
      
      if (!call.transcription) {
        return res.status(404).json({ error: 'No transcription available' });
      }
      
      res.json({
        transcription: call.transcription,
        summary: call.aiSummary
      });
    } catch (error) {
      logger.error('Get transcription error:', error);
      res.status(500).json({ error: 'Failed to get transcription' });
    }
  }

  // End active call
  async endCall(req, res) {
    try {
      const { callId } = req.params;
      
      const call = await prisma.call.findFirst({
        where: {
          id: callId,
          userId: req.userId,
          status: { in: ['initiated', 'ringing', 'answered'] }
        }
      });
      
      if (!call) {
        return res.status(404).json({ error: 'Active call not found' });
      }
      
      // End call with Plivo
      // Note: Implementation depends on Plivo SDK capabilities
      
      await prisma.call.update({
        where: { id: callId },
        data: { status: 'completed' }
      });
      
      res.json({ message: 'Call ended' });
    } catch (error) {
      logger.error('End call error:', error);
      res.status(500).json({ error: 'Failed to end call' });
    }
  }
}

module.exports = new CallsController();