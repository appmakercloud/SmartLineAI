const express = require('express');
const { body } = require('express-validator');
const subscriptionController = require('../controllers/subscriptionController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.get('/plans', subscriptionController.getPlans);

// Stripe webhook (no auth, validated by signature)
router.post('/webhook', 
  express.raw({ type: 'application/json' }), 
  subscriptionController.handleStripeWebhook
);

// Authenticated routes
router.use(authenticate);

// Get current subscription and usage
router.get('/current', subscriptionController.getCurrentSubscription);

// Start free trial
router.post('/trial', subscriptionController.startFreeTrial);

// Subscribe to a plan
router.post('/subscribe', [
  body('planId').isIn(['starter', 'professional', 'business', 'enterprise']).withMessage('Invalid plan'),
  body('paymentMethodId').isString().withMessage('Payment method required')
], subscriptionController.subscribe);

// Create checkout session
router.post('/checkout-session', [
  body('planId').isIn(['starter', 'professional', 'business', 'enterprise']).withMessage('Invalid plan')
], subscriptionController.createCheckoutSession);

// Create payment intent
router.post('/payment-intent', [
  body('planId').isIn(['starter', 'professional', 'business', 'enterprise']).withMessage('Invalid plan')
], subscriptionController.createPaymentIntent);

// Create setup intent (for saving payment methods)
router.post('/setup-intent', subscriptionController.createSetupIntent);

// Cancel subscription
router.post('/cancel', subscriptionController.cancelSubscription);

// Get usage details
router.get('/usage', subscriptionController.getUsage);

module.exports = router;