const { validationResult } = require('express-validator');
const subscriptionService = require('../services/subscriptionService');
const { logger } = require('../middleware/logging');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

class SubscriptionController {
  // Get all available plans
  async getPlans(req, res) {
    try {
      const plans = await subscriptionService.getPlans();
      res.json({ plans });
    } catch (error) {
      logger.error('Get plans error:', error);
      res.status(500).json({ error: 'Failed to get plans' });
    }
  }

  // Get current subscription
  async getCurrentSubscription(req, res) {
    try {
      const subscription = await subscriptionService.getCurrentSubscription(req.userId);
      const usage = await subscriptionService.checkUsageLimits(req.userId);
      
      res.json({
        subscription,
        usage
      });
    } catch (error) {
      logger.error('Get subscription error:', error);
      res.status(500).json({ error: 'Failed to get subscription' });
    }
  }

  // Start free trial
  async startFreeTrial(req, res) {
    try {
      const result = await subscriptionService.startFreeTrial(req.userId);
      res.json({
        message: 'Free trial started',
        trialEndsAt: result.trialEndsAt
      });
    } catch (error) {
      logger.error('Start trial error:', error);
      
      if (error.message === 'User already used free trial') {
        return res.status(400).json({ error: error.message });
      }
      
      res.status(500).json({ error: 'Failed to start trial' });
    }
  }

  // Subscribe to a plan
  async subscribe(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { planId, paymentMethodId } = req.body;
      
      const subscription = await subscriptionService.subscribeToPlan(
        req.userId,
        planId,
        paymentMethodId
      );
      
      res.json({
        message: 'Successfully subscribed',
        subscription
      });
    } catch (error) {
      logger.error('Subscribe error:', error);
      logger.error('Subscribe error details:', {
        message: error.message,
        type: error.type,
        code: error.code,
        stack: error.stack
      });
      
      if (error.type === 'StripeCardError') {
        return res.status(400).json({ error: 'Payment failed: ' + error.message });
      }
      
      res.status(500).json({ 
        error: 'Failed to subscribe',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  // Cancel subscription
  async cancelSubscription(req, res) {
    try {
      const result = await subscriptionService.cancelSubscription(req.userId);
      res.json(result);
    } catch (error) {
      logger.error('Cancel subscription error:', error);
      res.status(500).json({ error: 'Failed to cancel subscription' });
    }
  }

  // Get usage details
  async getUsage(req, res) {
    try {
      const usage = await subscriptionService.checkUsageLimits(req.userId);
      res.json(usage);
    } catch (error) {
      logger.error('Get usage error:', error);
      res.status(500).json({ error: 'Failed to get usage' });
    }
  }

  // Create Stripe Checkout Session
  async createCheckoutSession(req, res) {
    try {
      const { planId, successUrl, cancelUrl } = req.body;
      
      const session = await subscriptionService.createCheckoutSession(
        req.userId,
        planId,
        successUrl || 'smartlineai://subscription/success',
        cancelUrl || 'smartlineai://subscription/cancel'
      );
      
      res.json({
        sessionId: session.id,
        url: session.url
      });
    } catch (error) {
      logger.error('Create checkout session error:', error);
      res.status(500).json({ 
        error: 'Failed to create checkout session',
        message: error.message
      });
    }
  }

  // Webhook for Stripe events
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
      logger.error('Webhook error:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        // Handle successful checkout
        const session = event.data.object;
        logger.info('Checkout completed:', session);
        
        if (session.mode === 'subscription' && session.client_reference_id) {
          const userId = session.client_reference_id;
          const planId = session.metadata.planId;
          
          // Get the subscription details from Stripe
          const subscription = await stripe.subscriptions.retrieve(session.subscription);
          
          // Update local database
          await subscriptionService.handleCheckoutComplete(
            userId,
            planId,
            subscription.id,
            subscription.items.data[0].price.id
          );
        }
        break;
        
      case 'invoice.payment_succeeded':
        // Handle successful payment
        logger.info('Payment succeeded:', event.data.object);
        break;
        
      case 'invoice.payment_failed':
        // Handle failed payment
        logger.error('Payment failed:', event.data.object);
        // TODO: Send email notification
        break;
        
      case 'customer.subscription.deleted':
        // Handle subscription cancellation
        logger.info('Subscription cancelled:', event.data.object);
        // TODO: Update local database
        break;
        
      default:
        logger.info('Unhandled webhook event type:', event.type);
    }

    res.json({ received: true });
  }
}

module.exports = new SubscriptionController();