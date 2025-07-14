// Temporary endpoint to fix Stripe configuration
// DELETE THIS FILE AFTER USE - SECURITY RISK!

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Temporary endpoint to update Stripe IDs
// Access with secret key for security
router.post('/fix-stripe/:secretKey', async (req, res) => {
  try {
    // Simple security check
    if (req.params.secretKey !== 'temporary-fix-2024') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    console.log('Updating Stripe IDs in database...');
    
    const updates = [
      { id: 'free', productId: 'prod_Sg35Z4AfaVPtfE', priceId: 'price_1RkgywPAlYPOyo6SuznmPqId' },
      { id: 'starter', productId: 'prod_Sg366EQwqorvx9', priceId: 'price_1RkgzqPAlYPOyo6SWeOw7QbX' },
      { id: 'professional', productId: 'prod_Sg37ITAePdnELv', priceId: 'price_1Rkh17PAlYPOyo6SSjubU0dG' },
      { id: 'business', productId: 'prod_Sg38E0mcZ3WcB5', priceId: 'price_1Rkh1pPAlYPOyo6S6CJ1kJrE' },
      { id: 'enterprise', productId: 'prod_Sg38KFqwVoHrr4', priceId: 'price_1Rkh2ePAlYPOyo6SewVz8S0I' }
    ];
    
    const results = [];
    
    for (const update of updates) {
      try {
        const updated = await prisma.subscriptionPlan.update({
          where: { id: update.id },
          data: {
            stripeProductId: update.productId,
            stripePriceId: update.priceId
          }
        });
        results.push({ id: update.id, status: 'updated', stripePriceId: updated.stripePriceId });
      } catch (err) {
        results.push({ id: update.id, status: 'error', error: err.message });
      }
    }
    
    // Also ensure Stripe env vars are being used
    const envCheck = {
      STRIPE_SECRET_KEY: !!process.env.STRIPE_SECRET_KEY,
      STRIPE_WEBHOOK_SECRET: !!process.env.STRIPE_WEBHOOK_SECRET,
      STRIPE_FREE_PRICE_ID: process.env.STRIPE_FREE_PRICE_ID,
      STRIPE_STARTER_PRICE_ID: process.env.STRIPE_STARTER_PRICE_ID
    };
    
    res.json({
      success: true,
      updates: results,
      envCheck,
      message: 'Stripe IDs updated. This endpoint will self-destruct.'
    });
    
  } catch (error) {
    console.error('Error updating Stripe IDs:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to check current configuration
router.get('/check-stripe/:secretKey', async (req, res) => {
  if (req.params.secretKey !== 'temporary-fix-2024') {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  try {
    const plans = await prisma.subscriptionPlan.findMany({
      select: {
        id: true,
        displayName: true,
        stripePriceId: true,
        stripeProductId: true
      }
    });
    
    const envVars = {
      STRIPE_SECRET_KEY_SET: !!process.env.STRIPE_SECRET_KEY,
      STRIPE_WEBHOOK_SECRET_SET: !!process.env.STRIPE_WEBHOOK_SECRET,
      PRICE_IDS: {
        free: process.env.STRIPE_FREE_PRICE_ID,
        starter: process.env.STRIPE_STARTER_PRICE_ID,
        professional: process.env.STRIPE_PROFESSIONAL_PRICE_ID,
        business: process.env.STRIPE_BUSINESS_PRICE_ID,
        enterprise: process.env.STRIPE_ENTERPRISE_PRICE_ID
      }
    };
    
    res.json({ plans, envVars });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;