const express = require('express');
const { body } = require('express-validator');
const billingController = require('../controllers/billingController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get subscription plans
router.get('/plans', billingController.getPlans);

// Get current subscription
router.get('/subscription', billingController.getSubscription);

// Create subscription
router.post('/subscribe', [
  body('planId').isIn(['starter', 'professional', 'business']).withMessage('Invalid plan')
], billingController.createSubscription);

// Cancel subscription
router.post('/cancel', billingController.cancelSubscription);

// Buy credits
router.post('/credits', [
  body('amount').isIn([10, 25, 50, 100]).withMessage('Invalid credit amount')
], billingController.buyCredits);

// Get billing history
router.get('/history', billingController.getBillingHistory);

// Get usage summary
router.get('/usage', billingController.getUsage);

module.exports = router;