const { validationResult } = require('express-validator');
const usageService = require('../services/usageService');
const { logger } = require('../middleware/logging');

class UsageController {
  // Track usage
  async trackUsage(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { type, amount, timestamp } = req.body;
      
      await usageService.trackUsage(
        req.userId,
        type,
        amount,
        timestamp ? new Date(timestamp) : new Date()
      );
      
      res.json({ success: true });
    } catch (error) {
      logger.error('Track usage error:', error);
      res.status(500).json({ error: 'Failed to track usage' });
    }
  }

  // Get usage summary
  async getUsageSummary(req, res) {
    try {
      const summary = await usageService.getUsageSummary(req.userId);
      res.json(summary);
    } catch (error) {
      logger.error('Get usage summary error:', error);
      res.status(500).json({ error: 'Failed to get usage summary' });
    }
  }

  // Get usage history
  async getUsageHistory(req, res) {
    try {
      const { startDate, endDate, type } = req.query;
      
      const history = await usageService.getUsageHistory(
        req.userId,
        {
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
          type
        }
      );
      
      res.json({ history });
    } catch (error) {
      logger.error('Get usage history error:', error);
      res.status(500).json({ error: 'Failed to get usage history' });
    }
  }
}

module.exports = new UsageController();