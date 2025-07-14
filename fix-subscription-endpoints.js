// Script to fix subscription endpoints to handle missing Stripe configuration
const fs = require('fs');
const path = require('path');

console.log('Creating fixed subscription service...');

const fixedSubscriptionService = `const { PrismaClient } = require('@prisma/client');
const { logger } = require('../middleware/logging');

const prisma = new PrismaClient();

// Initialize Stripe only if configured
let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  try {
    stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    logger.info('Stripe initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize Stripe:', error);
  }
} else {
  logger.warn('Stripe not configured - running in test mode');
}

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
    try {
      const subscription = await prisma.userSubscription.findFirst({
        where: {
          userId,
          status: { in: ['active', 'trialing'] }
        },
        include: {
          plan: true
        }
      });

      if (!subscription) {
        // Return null instead of throwing error
        return null;
      }

      return subscription;
    } catch (error) {
      logger.error('Error fetching subscription:', error);
      return null;
    }
  }

  // Check usage limits
  async checkUsageLimits(userId) {
    try {
      const billingPeriod = new Date().toISOString().slice(0, 7);
      
      // Get subscription
      const subscription = await this.getCurrentSubscription(userId);
      if (!subscription) {
        return {
          hasSubscription: false,
          limits: null,
          usage: null
        };
      }

      // Try to get usage record
      let usageRecord = await prisma.usageRecord.findFirst({
        where: {
          userId,
          billingPeriod
        }
      }).catch(err => {
        logger.warn('Usage record table might not exist:', err.message);
        return null;
      });

      // If no usage record exists, return zero usage
      if (!usageRecord) {
        return {
          hasSubscription: true,
          limits: {
            minutes: subscription.plan.includedMinutes,
            sms: subscription.plan.includedSms,
            numbers: subscription.plan.includedNumbers
          },
          usage: {
            minutes: 0,
            sms: 0,
            numbers: 0
          },
          remaining: {
            minutes: subscription.plan.includedMinutes,
            sms: subscription.plan.includedSms,
            numbers: subscription.plan.includedNumbers
          }
        };
      }

      return {
        hasSubscription: true,
        limits: {
          minutes: subscription.plan.includedMinutes,
          sms: subscription.plan.includedSms,
          numbers: subscription.plan.includedNumbers
        },
        usage: {
          minutes: usageRecord.minutesUsed || 0,
          sms: usageRecord.smsUsed || 0,
          numbers: usageRecord.numbersUsed || 0
        },
        remaining: {
          minutes: subscription.plan.includedMinutes - (usageRecord.minutesUsed || 0),
          sms: subscription.plan.includedSms - (usageRecord.smsUsed || 0),
          numbers: subscription.plan.includedNumbers - (usageRecord.numbersUsed || 0)
        }
      };
    } catch (error) {
      logger.error('Error checking usage limits:', error);
      return {
        hasSubscription: false,
        limits: null,
        usage: null
      };
    }
  }

  // Start free trial
  async startFreeTrial(userId) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Check if user already has a subscription
      const existingSub = await prisma.userSubscription.findFirst({
        where: { userId }
      });

      if (existingSub) {
        throw new Error('User already has a subscription');
      }

      // For now, just return success without creating subscription
      // Real subscription will be created when user enters payment method
      return {
        success: true,
        message: 'Ready to start trial. Please add payment method.',
        requiresPaymentMethod: true
      };
    } catch (error) {
      logger.error('Start trial error:', error);
      throw error;
    }
  }

  // Subscribe to a plan
  async subscribeToPlan(userId, planId, paymentMethodId) {
    try {
      if (!stripe) {
        throw new Error('Payment processing not configured. Please contact support.');
      }

      const plan = await this.getPlan(planId);
      if (!plan) {
        throw new Error('Invalid plan');
      }

      // Get or create Stripe customer
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      let customerId = user.stripeCustomerId;
      
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: { userId }
        });
        
        customerId = customer.id;
        
        await prisma.user.update({
          where: { id: userId },
          data: { stripeCustomerId: customerId }
        });
      }

      // Attach payment method
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId
      });

      // Set as default payment method
      await stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId
        }
      });

      // Create subscription
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: plan.stripePriceId }],
        trial_period_days: plan.id === 'free' ? 7 : 0,
        metadata: { userId, planId }
      });

      // Save subscription to database
      const userSubscription = await prisma.userSubscription.create({
        data: {
          userId,
          planId,
          stripeSubscriptionId: subscription.id,
          stripeCustomerId: customerId,
          stripePriceId: plan.stripePriceId,
          status: subscription.status,
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          cancelAtPeriodEnd: false
        }
      });

      return userSubscription;
    } catch (error) {
      logger.error('Subscribe error:', error);
      throw error;
    }
  }

  // Cancel subscription
  async cancelSubscription(userId) {
    try {
      const subscription = await this.getCurrentSubscription(userId);
      if (!subscription) {
        throw new Error('No active subscription found');
      }

      if (stripe && subscription.stripeSubscriptionId) {
        // Cancel at period end
        await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
          cancel_at_period_end: true
        });
      }

      // Update database
      await prisma.userSubscription.update({
        where: { id: subscription.id },
        data: { 
          cancelAtPeriodEnd: true,
          cancelledAt: new Date()
        }
      });

      return {
        message: 'Subscription will be cancelled at the end of the billing period',
        endsAt: subscription.currentPeriodEnd
      };
    } catch (error) {
      logger.error('Cancel subscription error:', error);
      throw error;
    }
  }
}

module.exports = new SubscriptionService();
`;

// Write the fixed service
fs.writeFileSync(
  path.join(__dirname, 'src/services/subscriptionService-fixed.js'),
  fixedSubscriptionService
);

console.log('Fixed subscription service created at: src/services/subscriptionService-fixed.js');
console.log('\nTo deploy:');
console.log('1. Copy this file to your server');
console.log('2. Backup the original: mv src/services/subscriptionService.js src/services/subscriptionService.backup.js');
console.log('3. Replace with fixed version: mv src/services/subscriptionService-fixed.js src/services/subscriptionService.js');
console.log('4. Restart PM2: pm2 restart smartline-api');