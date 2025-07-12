const { PrismaClient } = require('@prisma/client');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { logger } = require('../middleware/logging');

const prisma = new PrismaClient();

class BillingController {
  // Get subscription plans
  async getPlans(req, res) {
    const plans = [
      {
        id: 'starter',
        name: 'Starter',
        price: 19,
        features: [
          '1 phone number',
          '300 minutes/month',
          'Unlimited SMS',
          'Basic voicemail',
          'Business hours routing'
        ]
      },
      {
        id: 'professional',
        name: 'Professional',
        price: 39,
        features: [
          '1 phone number',
          '1000 minutes/month',
          'Unlimited SMS',
          'AI voicemail transcription',
          'Call recording',
          'Auto-attendant'
        ]
      },
      {
        id: 'business',
        name: 'Business',
        price: 79,
        features: [
          '3 phone numbers',
          '2500 minutes/month',
          'All Professional features',
          'AI call summaries',
          'CRM integration',
          'Advanced analytics'
        ]
      }
    ];
    
    res.json({ plans });
  }

  // Get current subscription
  async getSubscription(req, res) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        select: {
          subscription: true,
          credits: true
        }
      });
      
      res.json({
        plan: user.subscription,
        credits: user.credits
      });
    } catch (error) {
      logger.error('Get subscription error:', error);
      res.status(500).json({ error: 'Failed to get subscription' });
    }
  }

  // Create subscription
  async createSubscription(req, res) {
    try {
      const { planId } = req.body;
      
      // Create Stripe checkout session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: `SmartLine AI ${planId} Plan`,
            },
            unit_amount: this.getPlanPrice(planId) * 100,
            recurring: {
              interval: 'month'
            }
          },
          quantity: 1,
        }],
        mode: 'subscription',
        success_url: `${process.env.FRONTEND_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL}/billing/cancel`,
        metadata: {
          userId: req.userId,
          planId
        }
      });
      
      res.json({ checkoutUrl: session.url });
    } catch (error) {
      logger.error('Create subscription error:', error);
      res.status(500).json({ error: 'Failed to create subscription' });
    }
  }

  // Cancel subscription
  async cancelSubscription(req, res) {
    try {
      // Update user to free plan
      await prisma.user.update({
        where: { id: req.userId },
        data: { subscription: 'free' }
      });
      
      res.json({ message: 'Subscription cancelled' });
    } catch (error) {
      logger.error('Cancel subscription error:', error);
      res.status(500).json({ error: 'Failed to cancel subscription' });
    }
  }

  // Buy credits
  async buyCredits(req, res) {
    try {
      const { amount } = req.body;
      
      const prices = {
        10: 999,  // $9.99
        25: 2299, // $22.99
        50: 4299, // $42.99
        100: 7999 // $79.99
      };
      
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${amount} SmartLine AI Credits`,
            },
            unit_amount: prices[amount]
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: `${process.env.FRONTEND_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL}/billing/cancel`,
        metadata: {
          userId: req.userId,
          type: 'credits',
          amount
        }
      });
      
      res.json({ checkoutUrl: session.url });
    } catch (error) {
      logger.error('Buy credits error:', error);
      res.status(500).json({ error: 'Failed to buy credits' });
    }
  }

  // Get billing history
  async getBillingHistory(req, res) {
    try {
      const transactions = await prisma.transaction.findMany({
        where: { userId: req.userId },
        orderBy: { createdAt: 'desc' },
        take: 50
      });
      
      res.json({ transactions });
    } catch (error) {
      logger.error('Get billing history error:', error);
      res.status(500).json({ error: 'Failed to get billing history' });
    }
  }

  // Get usage summary
  async getUsage(req, res) {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const [callMinutes, messageCount] = await Promise.all([
        prisma.call.aggregate({
          where: {
            userId: req.userId,
            createdAt: { gte: startOfMonth }
          },
          _sum: { duration: true }
        }),
        prisma.message.count({
          where: {
            userId: req.userId,
            direction: 'outbound',
            createdAt: { gte: startOfMonth }
          }
        })
      ]);
      
      res.json({
        minutes: Math.ceil((callMinutes._sum.duration || 0) / 60),
        messages: messageCount,
        period: {
          start: startOfMonth,
          end: now
        }
      });
    } catch (error) {
      logger.error('Get usage error:', error);
      res.status(500).json({ error: 'Failed to get usage' });
    }
  }

  // Stripe webhook handler
  async handleStripeWebhook(req, res) {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      logger.error('Webhook signature verification failed:', err);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        
        if (session.metadata.type === 'credits') {
          // Add credits
          await prisma.user.update({
            where: { id: session.metadata.userId },
            data: {
              credits: {
                increment: parseInt(session.metadata.amount)
              }
            }
          });
        } else {
          // Update subscription
          await prisma.user.update({
            where: { id: session.metadata.userId },
            data: {
              subscription: session.metadata.planId
            }
          });
        }
        
        // Record transaction
        await prisma.transaction.create({
          data: {
            userId: session.metadata.userId,
            type: session.metadata.type || 'subscription',
            amount: session.amount_total / 100,
            currency: session.currency.toUpperCase(),
            status: 'completed',
            stripeId: session.id,
            description: session.metadata.type === 'credits' 
              ? `Purchased ${session.metadata.amount} credits`
              : `Subscribed to ${session.metadata.planId} plan`
          }
        });
        break;

      default:
        logger.info(`Unhandled webhook event type: ${event.type}`);
    }

    res.json({ received: true });
  }

  // Helper method
  getPlanPrice(planId) {
    const prices = {
      starter: 19,
      professional: 39,
      business: 79
    };
    return prices[planId] || 0;
  }
}

module.exports = new BillingController();