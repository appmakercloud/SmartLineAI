const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const auth = require('../middleware/auth');
const { logger } = require('../middleware/logging');

// Create a test payment method for development
router.post('/create-test-payment-method', auth, async (req, res) => {
  try {
    // Check if Stripe is configured
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(503).json({ 
        error: 'Stripe not configured',
        message: 'Please add STRIPE_SECRET_KEY to environment variables'
      });
    }

    // Create a test payment method using Stripe test card
    const paymentMethod = await stripe.paymentMethods.create({
      type: 'card',
      card: {
        number: '4242424242424242',
        exp_month: 12,
        exp_year: 2034,
        cvc: '123',
      },
    });

    logger.info(`Test payment method created: ${paymentMethod.id}`);
    
    res.json({
      success: true,
      paymentMethodId: paymentMethod.id,
      message: 'Test payment method created successfully'
    });
    
  } catch (error) {
    logger.error('Create test payment method error:', error);
    res.status(500).json({ 
      error: 'Failed to create test payment method',
      details: error.message 
    });
  }
});

module.exports = router;