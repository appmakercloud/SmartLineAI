const { PrismaClient } = require('@prisma/client');
const { logger } = require('../middleware/logging');

const prisma = new PrismaClient();

class SubscriptionService {
  // Get all available plans
  async getPlans() {
    // Return hardcoded plans if database is empty
    const plans = await prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' }
    }).catch(() => []);

    if (plans.length === 0) {
      // Return default plans
      return [
        {
          id: 'free',
          name: 'free',
          displayName: 'Free Trial',
          price: 0,
          currency: 'USD',
          interval: 'month',
          includedMinutes: 50,
          includedSms: 50,
          includedNumbers: 1,
          pricePerExtraMinute: 0.025,
          pricePerExtraSms: 0.01,
          maxNumbers: 1,
          features: {
            voicemail: true,
            callRecording: false,
            analytics: false,
            apiAccess: false,
            customGreeting: false,
            callTransfer: false,
            teamMembers: 1
          },
          sortOrder: 0,
          isActive: true
        },
        {
          id: 'starter',
          name: 'starter',
          displayName: 'Starter',
          price: 19.99,
          currency: 'USD',
          interval: 'month',
          includedMinutes: 500,
          includedSms: 500,
          includedNumbers: 2,
          pricePerExtraMinute: 0.02,
          pricePerExtraSms: 0.008,
          maxNumbers: 5,
          features: {
            voicemail: true,
            callRecording: true,
            analytics: false,
            apiAccess: false,
            customGreeting: true,
            callTransfer: false,
            teamMembers: 1
          },
          sortOrder: 1,
          isActive: true
        }
      ];
    }

    return plans;
  }

  // Get user's current subscription
  async getCurrentSubscription(userId) {
    // For development, return a mock subscription
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) return null;

    return {
      id: 'mock-subscription',
      userId: userId,
      planId: 'free',
      status: 'trialing',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      plan: {
        id: 'free',
        displayName: 'Free Trial',
        includedMinutes: 50,
        includedSms: 50,
        includedNumbers: 1
      }
    };
  }

  // Start free trial (without Stripe)
  async startFreeTrial(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('User not found');
    }

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 7);

    // Update user with trial info
    await prisma.user.update({
      where: { id: userId },
      data: {
        subscription: 'free'
      }
    });

    logger.info(`Started free trial for user ${userId}`);
    return { 
      trialEndsAt,
      subscription: {
        id: 'trial-' + Date.now(),
        status: 'trialing',
        planId: 'free',
        trialEndsAt
      }
    };
  }

  // Mock subscribe method
  async subscribeToPlan(userId, planId, paymentMethodId) {
    // For development, just update the user's subscription
    await prisma.user.update({
      where: { id: userId },
      data: {
        subscription: planId
      }
    });

    return {
      id: 'sub-' + Date.now(),
      userId,
      planId,
      status: 'active',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    };
  }

  // Get usage for user
  async getUsage(userId) {
    // Return mock usage
    return {
      userId,
      billingPeriod: new Date().toISOString().slice(0, 7),
      minutesUsed: 0,
      smsUsed: 0,
      numbersUsed: 0,
      limits: {
        minutesLimit: 50,
        smsLimit: 50,
        numbersLimit: 1,
        minutesRemaining: 50,
        smsRemaining: 50,
        numbersRemaining: 1
      },
      overage: {
        minutes: 0,
        sms: 0,
        estimatedCost: 0
      }
    };
  }
}

module.exports = new SubscriptionService();