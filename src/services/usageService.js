const { PrismaClient } = require('@prisma/client');
const { logger } = require('../middleware/logging');
const subscriptionService = require('./subscriptionService');

const prisma = new PrismaClient();

class UsageService {
  // Track usage
  async trackUsage(userId, type, amount, timestamp = new Date()) {
    // Get current subscription
    const subscription = await subscriptionService.getCurrentSubscription(userId);
    if (!subscription) {
      throw new Error('No active subscription');
    }

    // Create usage record
    await prisma.usageHistory.create({
      data: {
        userId,
        subscriptionId: subscription.id,
        type,
        amount,
        timestamp,
        metadata: {}
      }
    });

    // Update subscription usage totals
    if (type === 'call') {
      await prisma.userSubscription.update({
        where: { id: subscription.id },
        data: {
          minutesUsed: {
            increment: amount
          }
        }
      });
    } else if (type === 'sms') {
      await prisma.userSubscription.update({
        where: { id: subscription.id },
        data: {
          smsUsed: {
            increment: Math.round(amount)
          }
        }
      });
    }

    // Check for limit exceeded
    const usage = await subscriptionService.checkUsageLimits(userId);
    if (usage.limits.minutesRemaining < 0 || usage.limits.smsRemaining < 0) {
      logger.warn(`User ${userId} exceeded usage limits`);
      // Could trigger notifications here
    }

    logger.info(`Tracked ${type} usage for user ${userId}: ${amount}`);
  }

  // Get usage summary
  async getUsageSummary(userId) {
    const subscription = await subscriptionService.getCurrentSubscription(userId);
    if (!subscription) {
      return {
        hasSubscription: false,
        usage: null
      };
    }

    const usage = await subscriptionService.checkUsageLimits(userId);
    return usage;
  }

  // Get usage history
  async getUsageHistory(userId, options = {}) {
    const { startDate, endDate, type } = options;

    const where = {
      userId
    };

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = startDate;
      if (endDate) where.timestamp.lte = endDate;
    }

    if (type) {
      where.type = type;
    }

    const history = await prisma.usageHistory.findMany({
      where,
      orderBy: {
        timestamp: 'desc'
      },
      take: 100
    });

    return history;
  }

  // Reset monthly usage (called by cron job)
  async resetMonthlyUsage() {
    const activeSubscriptions = await prisma.userSubscription.findMany({
      where: {
        status: 'active',
        currentPeriodEnd: {
          lte: new Date()
        }
      }
    });

    for (const subscription of activeSubscriptions) {
      // Calculate new period
      const newPeriodStart = new Date();
      const newPeriodEnd = new Date();
      newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);

      // Reset usage and update period
      await prisma.userSubscription.update({
        where: { id: subscription.id },
        data: {
          minutesUsed: 0,
          smsUsed: 0,
          currentPeriodStart: newPeriodStart,
          currentPeriodEnd: newPeriodEnd,
          nextBillingDate: newPeriodEnd
        }
      });

      logger.info(`Reset usage for subscription ${subscription.id}`);
    }
  }

  // Calculate overage charges
  async calculateOverageCharges(subscriptionId) {
    const subscription = await prisma.userSubscription.findUnique({
      where: { id: subscriptionId },
      include: { plan: true }
    });

    if (!subscription || !subscription.plan) {
      return null;
    }

    const minutesOverage = Math.max(0, subscription.minutesUsed - subscription.plan.includedMinutes);
    const smsOverage = Math.max(0, subscription.smsUsed - subscription.plan.includedSms);

    const minutesCharge = minutesOverage * subscription.plan.pricePerExtraMinute;
    const smsCharge = smsOverage * subscription.plan.pricePerExtraSms;

    return {
      minutesOverage,
      smsOverage,
      minutesCharge,
      smsCharge,
      totalCharge: minutesCharge + smsCharge
    };
  }
}

module.exports = new UsageService();