const { PrismaClient } = require('@prisma/client');
const { logger } = require('../middleware/logging');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const stripeConfig = require('../config/stripe');

const prisma = new PrismaClient();

class SubscriptionService {
  // Get all available plans
  async getPlans() {
    return await prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' }
    });
  }

  // Get a specific plan
  async getPlan(planId) {
    return await prisma.subscriptionPlan.findUnique({
      where: { id: planId }
    });
  }

  // Get user's current subscription
  async getCurrentSubscription(userId) {
    return await prisma.userSubscription.findFirst({
      where: {
        userId,
        status: 'active'
      },
      include: {
        plan: true
      }
    });
  }

  // Start free trial
  async startFreeTrial(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Check if user already had a trial
    if (user.trialStatus !== 'none') {
      throw new Error('User already used free trial');
    }

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 7);

    // Update user with trial info
    await prisma.user.update({
      where: { id: userId },
      data: {
        freeTrialStartsAt: new Date(),
        freeTrialEndsAt: trialEndsAt,
        trialStatus: 'active',
        subscription: 'free'
      }
    });

    logger.info(`Started free trial for user ${userId}`);
    return { trialEndsAt };
  }

  // Subscribe to a plan
  async subscribeToPlan(userId, planId, paymentMethodId) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    const plan = await this.getPlan(planId);
    if (!plan) {
      throw new Error('Invalid plan');
    }

    // Temporary bypass for testing without Stripe products
    if (process.env.BYPASS_STRIPE === 'true') {
      logger.info('Bypassing Stripe for testing');
      
      const subscription = await prisma.userSubscription.create({
        data: {
          userId,
          planId,
          status: 'active',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          stripeSubscriptionId: `sub_test_${Date.now()}`,
          stripePriceId: `price_test_${planId}`
        }
      });
      
      await prisma.user.update({
        where: { id: userId },
        data: { 
          subscription: planId,
          subscriptionStatus: 'active',
          stripeCustomerId: `cus_test_${Date.now()}`,
          stripeSubscriptionId: subscription.stripeSubscriptionId,
          stripePriceId: subscription.stripePriceId
        }
      });
      
      logger.info(`User ${userId} subscribed to ${planId} plan (test mode)`);
      return subscription;
    }

    // Check for existing active subscription
    const existingSubscription = await this.getCurrentSubscription(userId);
    if (existingSubscription) {
      // Handle as an upgrade/downgrade
      return await this.upgradeSubscription(userId, planId, paymentMethodId);
    }

    try {
      // Check if Stripe is configured
      if (!process.env.STRIPE_SECRET_KEY) {
        throw new Error('Stripe is not configured. Please add STRIPE_SECRET_KEY to environment variables.');
      }

      // Create or get Stripe customer
      let stripeCustomerId = user.stripeCustomerId;
      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: { userId }
        });
        stripeCustomerId = customer.id;
        
        await prisma.user.update({
          where: { id: userId },
          data: { stripeCustomerId }
        });
      }

      // Handle test payment methods differently
      if (paymentMethodId === 'pm_card_visa' || paymentMethodId.startsWith('pm_card_')) {
        logger.info('Creating test payment method from token');
        try {
          // For predefined test payment methods, create a new one using the test token
          const newPaymentMethod = await stripe.paymentMethods.create({
            type: 'card',
            card: {
              token: 'tok_visa' // Use Stripe's test token
            }
          });
          paymentMethodId = newPaymentMethod.id;
          logger.info('Created test payment method:', paymentMethodId);
        } catch (pmError) {
          logger.error('Failed to create test payment method:', pmError);
          throw pmError;
        }
      }

      // Attach payment method
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: stripeCustomerId
      });

      // Set as default payment method
      await stripe.customers.update(stripeCustomerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId
        }
      });

      // Get Stripe price ID from config
      const stripePriceId = stripeConfig.plans[planId]?.priceId;
      if (!stripePriceId) {
        throw new Error('Stripe price ID not configured for this plan');
      }

      // Create Stripe subscription
      const stripeSubscription = await stripe.subscriptions.create({
        customer: stripeCustomerId,
        items: [{ price: stripePriceId }],
        expand: ['latest_invoice.payment_intent']
      });

      // Create local subscription record
      const currentPeriodStart = new Date();
      const currentPeriodEnd = new Date();
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);

      const subscription = await prisma.userSubscription.create({
        data: {
          userId,
          planId,
          status: 'active',
          currentPeriodStart,
          currentPeriodEnd,
          stripeSubscriptionId: stripeSubscription.id,
          stripePriceId: stripePriceId,
          nextBillingDate: currentPeriodEnd
        }
      });

      // Update user subscription status
      await prisma.user.update({
        where: { id: userId },
        data: { 
          subscription: planId,
          trialStatus: user.trialStatus === 'active' ? 'upgraded' : user.trialStatus
        }
      });

      logger.info(`User ${userId} subscribed to ${planId} plan`);
      return subscription;
    } catch (error) {
      logger.error('Subscription error:', error);
      throw error;
    }
  }

  // Upgrade/Downgrade subscription
  async upgradeSubscription(userId, newPlanId, paymentMethodId) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('User not found');
    }

    const currentSubscription = await this.getCurrentSubscription(userId);
    if (!currentSubscription) {
      throw new Error('No active subscription found');
    }

    // Get the new plan details
    const newPlan = await prisma.subscriptionPlan.findUnique({
      where: { id: newPlanId }
    });

    if (!newPlan) {
      throw new Error('Invalid plan');
    }

    const stripeConfig = stripeConfigFile.plans[newPlanId];
    if (!stripeConfig) {
      throw new Error('Plan not configured in Stripe');
    }

    // Temporary bypass for testing without Stripe products
    if (process.env.BYPASS_STRIPE === 'true') {
      logger.info('Bypassing Stripe for upgrade testing');
      
      // Update the existing subscription
      const updatedSubscription = await prisma.userSubscription.update({
        where: { id: currentSubscription.id },
        data: {
          planId: newPlanId,
          stripePriceId: `price_test_${newPlanId}`,
          updatedAt: new Date()
        }
      });
      
      // Update user record
      await prisma.user.update({
        where: { id: userId },
        data: { 
          subscription: newPlanId,
          stripePriceId: `price_test_${newPlanId}`
        }
      });
      
      logger.info(`User ${userId} upgraded to ${newPlanId} plan (test mode)`);
      return updatedSubscription;
    }

    try {
      // Update payment method if provided
      if (paymentMethodId && currentSubscription.stripeSubscriptionId) {
        await stripe.subscriptions.update(currentSubscription.stripeSubscriptionId, {
          default_payment_method: paymentMethodId
        });
      }

      // Update Stripe subscription
      if (currentSubscription.stripeSubscriptionId) {
        const stripeSubscription = await stripe.subscriptions.update(
          currentSubscription.stripeSubscriptionId,
          {
            items: [{
              id: (await stripe.subscriptions.retrieve(currentSubscription.stripeSubscriptionId)).items.data[0].id,
              price: stripeConfig.priceId
            }],
            proration_behavior: 'create_prorations'
          }
        );

        // Update local records
        const updatedSubscription = await prisma.userSubscription.update({
          where: { id: currentSubscription.id },
          data: {
            planId: newPlanId,
            stripePriceId: stripeConfig.priceId,
            updatedAt: new Date()
          }
        });

        // Update user subscription status
        await prisma.user.update({
          where: { id: userId },
          data: { 
            subscription: newPlanId,
            stripePriceId: stripeConfig.priceId
          }
        });

        logger.info(`User ${userId} upgraded from ${currentSubscription.planId} to ${newPlanId}`);
        return updatedSubscription;
      } else {
        throw new Error('No Stripe subscription ID found');
      }
    } catch (error) {
      logger.error('Upgrade subscription error:', error);
      throw error;
    }
  }

  // Cancel subscription
  async cancelSubscription(userId) {
    const subscription = await this.getCurrentSubscription(userId);
    if (!subscription) {
      throw new Error('No active subscription found');
    }

    try {
      // Cancel in Stripe
      if (subscription.stripeSubscriptionId) {
        await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
          cancel_at_period_end: true
        });
      }

      // Update local record
      await prisma.userSubscription.update({
        where: { id: subscription.id },
        data: {
          status: 'cancelled',
          cancelledAt: new Date()
        }
      });

      logger.info(`Cancelled subscription for user ${userId}`);
      return { message: 'Subscription cancelled' };
    } catch (error) {
      logger.error('Cancel subscription error:', error);
      throw error;
    }
  }

  // Track usage
  async trackUsage(userId, type, amount) {
    const subscription = await this.getCurrentSubscription(userId);
    
    if (!subscription) {
      // Check if user is on free trial
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (user.trialStatus === 'active') {
        // Update trial usage
        if (type === 'call') {
          await prisma.user.update({
            where: { id: userId },
            data: { freeMinutesUsed: { increment: amount } }
          });
        } else if (type === 'sms') {
          await prisma.user.update({
            where: { id: userId },
            data: { freeSmsUsed: { increment: amount } }
          });
        }
        return;
      }
      
      throw new Error('No active subscription or trial');
    }

    // Update subscription usage
    if (type === 'call') {
      await prisma.userSubscription.update({
        where: { id: subscription.id },
        data: { minutesUsed: { increment: amount } }
      });
    } else if (type === 'sms') {
      await prisma.userSubscription.update({
        where: { id: subscription.id },
        data: { smsUsed: { increment: amount } }
      });
    }

    // Record in usage history
    await prisma.usageHistory.create({
      data: {
        userId,
        subscriptionId: subscription.id,
        type,
        amount,
        date: new Date()
      }
    });
  }

  // Check usage limits
  async checkUsageLimits(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    // Check trial limits
    if (user.trialStatus === 'active') {
      return {
        isTrial: true,
        minutesRemaining: Math.max(0, 50 - user.freeMinutesUsed),
        smsRemaining: Math.max(0, 50 - user.freeSmsUsed),
        daysRemaining: Math.max(0, Math.ceil((user.freeTrialEndsAt - new Date()) / (1000 * 60 * 60 * 24)))
      };
    }

    const subscription = await this.getCurrentSubscription(userId);
    if (!subscription) {
      return { hasSubscription: false };
    }

    const { plan } = subscription;
    return {
      hasSubscription: true,
      plan: plan.displayName,
      minutesUsed: subscription.minutesUsed,
      minutesIncluded: plan.includedMinutes,
      minutesRemaining: Math.max(0, plan.includedMinutes - subscription.minutesUsed),
      smsUsed: subscription.smsUsed,
      smsIncluded: plan.includedSms,
      smsRemaining: Math.max(0, plan.includedSms - subscription.smsUsed),
      willRenewAt: subscription.currentPeriodEnd
    };
  }

  // Reset monthly usage (run via cron job)
  async resetMonthlyUsage() {
    const now = new Date();
    
    // Find subscriptions that need reset
    const subscriptionsToReset = await prisma.userSubscription.findMany({
      where: {
        status: 'active',
        currentPeriodEnd: { lte: now }
      }
    });

    for (const subscription of subscriptionsToReset) {
      const newPeriodStart = subscription.currentPeriodEnd;
      const newPeriodEnd = new Date(newPeriodStart);
      newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);

      await prisma.userSubscription.update({
        where: { id: subscription.id },
        data: {
          currentPeriodStart: newPeriodStart,
          currentPeriodEnd: newPeriodEnd,
          minutesUsed: 0,
          smsUsed: 0
        }
      });

      logger.info(`Reset usage for subscription ${subscription.id}`);
    }
  }

  // Expire trials (run via cron job)
  async expireTrials() {
    const now = new Date();
    
    // Find expired trials
    const expiredTrials = await prisma.user.findMany({
      where: {
        trialStatus: 'active',
        freeTrialEndsAt: { lte: now }
      }
    });

    for (const user of expiredTrials) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          trialStatus: 'expired',
          subscription: 'none'
        }
      });

      // TODO: Send email notification
      logger.info(`Expired trial for user ${user.id}`);
    }
  }
}

module.exports = new SubscriptionService();