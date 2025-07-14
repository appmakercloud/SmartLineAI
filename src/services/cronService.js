const cron = require('node-cron');
const { logger } = require('../middleware/logging');
const usageService = require('./usageService');
const subscriptionService = require('./subscriptionService');

class CronService {
  start() {
    // Reset usage at midnight on the 1st of each month
    cron.schedule('0 0 1 * *', async () => {
      logger.info('Running monthly usage reset...');
      try {
        await usageService.resetMonthlyUsage();
        logger.info('Monthly usage reset completed');
      } catch (error) {
        logger.error('Monthly usage reset failed:', error);
      }
    });

    // Check for expired trials daily at 2 AM
    cron.schedule('0 2 * * *', async () => {
      logger.info('Checking for expired trials...');
      try {
        await this.checkExpiredTrials();
        logger.info('Expired trials check completed');
      } catch (error) {
        logger.error('Expired trials check failed:', error);
      }
    });

    // Process overage charges daily at 3 AM
    cron.schedule('0 3 * * *', async () => {
      logger.info('Processing overage charges...');
      try {
        await this.processOverageCharges();
        logger.info('Overage charges processing completed');
      } catch (error) {
        logger.error('Overage charges processing failed:', error);
      }
    });

    logger.info('Cron jobs started');
  }

  async checkExpiredTrials() {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    // Find expired trials
    const expiredTrials = await prisma.user.findMany({
      where: {
        trialStatus: 'active',
        trialEndsAt: {
          lte: new Date()
        }
      }
    });

    for (const user of expiredTrials) {
      // Update trial status
      await prisma.user.update({
        where: { id: user.id },
        data: {
          trialStatus: 'expired',
          subscription: 'none'
        }
      });

      // Cancel any active trial subscription
      const subscription = await prisma.userSubscription.findFirst({
        where: {
          userId: user.id,
          status: 'trialing'
        }
      });

      if (subscription) {
        await prisma.userSubscription.update({
          where: { id: subscription.id },
          data: {
            status: 'expired',
            cancelledAt: new Date()
          }
        });
      }

      logger.info(`Expired trial for user ${user.id}`);
    }
  }

  async processOverageCharges() {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

    // Find subscriptions with overage
    const subscriptions = await prisma.userSubscription.findMany({
      where: {
        status: 'active',
        OR: [
          {
            minutesUsed: {
              gt: prisma.userSubscription.fields.plan.includedMinutes
            }
          },
          {
            smsUsed: {
              gt: prisma.userSubscription.fields.plan.includedSms
            }
          }
        ]
      },
      include: {
        user: true,
        plan: true
      }
    });

    for (const subscription of subscriptions) {
      try {
        const overage = await usageService.calculateOverageCharges(subscription.id);
        
        if (overage && overage.totalCharge > 0) {
          // Create Stripe invoice item for overage
          if (subscription.user.stripeCustomerId) {
            await stripe.invoiceItems.create({
              customer: subscription.user.stripeCustomerId,
              amount: Math.round(overage.totalCharge * 100), // Convert to cents
              currency: 'usd',
              description: `Usage overage: ${overage.minutesOverage} minutes, ${overage.smsOverage} SMS`
            });

            logger.info(`Created overage charge for user ${subscription.userId}: $${overage.totalCharge}`);
          }
        }
      } catch (error) {
        logger.error(`Failed to process overage for subscription ${subscription.id}:`, error);
      }
    }
  }
}

module.exports = new CronService();