const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');
const aiService = require('../services/aiService');
const { logger } = require('../middleware/logging');

const prisma = new PrismaClient();

class AIController {
  // Get AI settings
  async getSettings(req, res) {
    try {
      const settings = await prisma.aISettings.findUnique({
        where: { userId: req.userId }
      });
      
      if (!settings) {
        // Create default settings
        const newSettings = await prisma.aISettings.create({
          data: {
            userId: req.userId,
            voicemailEnabled: true,
            transcriptionEnabled: true
          }
        });
        return res.json(newSettings);
      }
      
      res.json(settings);
    } catch (error) {
      logger.error('Get AI settings error:', error);
      res.status(500).json({ error: 'Failed to get settings' });
    }
  }

  // Update AI settings
  async updateSettings(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const updates = req.body;
      
      const settings = await prisma.aISettings.upsert({
        where: { userId: req.userId },
        update: updates,
        create: {
          userId: req.userId,
          ...updates
        }
      });
      
      res.json(settings);
    } catch (error) {
      logger.error('Update AI settings error:', error);
      res.status(500).json({ error: 'Failed to update settings' });
    }
  }

  // Generate smart reply
  async generateSmartReply(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { message, context } = req.body;
      
      const reply = await aiService.generateSmartReply(message, context);
      
      res.json({ reply });
    } catch (error) {
      logger.error('Generate smart reply error:', error);
      res.status(500).json({ error: 'Failed to generate reply' });
    }
  }

  // Summarize call
  async summarizeCall(req, res) {
    try {
      const { callId } = req.body;
      
      // Get call with transcription
      const call = await prisma.call.findFirst({
        where: {
          id: callId,
          userId: req.userId
        }
      });
      
      if (!call) {
        return res.status(404).json({ error: 'Call not found' });
      }
      
      if (!call.transcription) {
        return res.status(400).json({ error: 'No transcription available' });
      }
      
      // Generate summary
      const summary = await aiService.summarizeVoicemail(call.transcription);
      
      // Save summary
      await prisma.call.update({
        where: { id: callId },
        data: { aiSummary: summary }
      });
      
      res.json({ summary });
    } catch (error) {
      logger.error('Summarize call error:', error);
      res.status(500).json({ error: 'Failed to summarize call' });
    }
  }

  // Get insights
  async getInsights(req, res) {
    try {
      // Get user's call data for the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const calls = await prisma.call.findMany({
        where: {
          userId: req.userId,
          createdAt: { gte: thirtyDaysAgo }
        },
        select: {
          duration: true,
          direction: true,
          createdAt: true,
          status: true
        }
      });
      
      const messages = await prisma.message.count({
        where: {
          userId: req.userId,
          createdAt: { gte: thirtyDaysAgo }
        }
      });
      
      // Basic insights
      const insights = {
        totalCalls: calls.length,
        totalMessages: messages,
        averageCallDuration: calls.length > 0 
          ? Math.round(calls.reduce((sum, call) => sum + call.duration, 0) / calls.length)
          : 0,
        missedCalls: calls.filter(call => call.status === 'no-answer').length,
        peakHours: this.calculatePeakHours(calls)
      };
      
      // Get AI analysis if enough data
      if (calls.length > 10) {
        insights.aiAnalysis = await aiService.analyzeCallPatterns(calls);
      }
      
      res.json(insights);
    } catch (error) {
      logger.error('Get insights error:', error);
      res.status(500).json({ error: 'Failed to get insights' });
    }
  }

  // Helper to calculate peak hours
  calculatePeakHours(calls) {
    const hourCounts = {};
    
    calls.forEach(call => {
      const hour = new Date(call.createdAt).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
    
    const sortedHours = Object.entries(hourCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => parseInt(hour));
    
    return sortedHours;
  }
}

module.exports = new AIController();