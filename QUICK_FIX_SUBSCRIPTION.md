# Quick Fix for Subscription Error

The subscription is failing because Stripe is not configured. Here's how to fix it temporarily:

## Option 1: Use Non-Stripe Version (Quick Fix)

1. Go to Render Dashboard → Environment
2. Add this variable:
   ```
   DISABLE_STRIPE=true
   ```

3. Update the subscription controller to use the non-Stripe service:
   
   In Render Shell:
   ```bash
   cd src/services
   mv subscriptionService.js subscriptionService-stripe.js
   mv subscriptionService-nostripe.js subscriptionService.js
   ```

## Option 2: Configure Stripe Properly

1. Create a Stripe account at https://stripe.com
2. Get your API keys from Stripe Dashboard
3. Create products and prices in Stripe
4. Add to Render Environment:
   ```
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_PRODUCT_ID_STARTER=prod_...
   STRIPE_PRODUCT_ID_PROFESSIONAL=prod_...
   STRIPE_PRODUCT_ID_BUSINESS=prod_...
   ```

## Option 3: Mock Subscription for Testing

Add this endpoint to bypass Stripe temporarily:

```javascript
// In subscriptionController.js subscribe method
async subscribe(req, res) {
  try {
    const { planId } = req.body;
    
    // Temporary mock subscription
    if (process.env.NODE_ENV === 'development' || process.env.MOCK_PAYMENTS === 'true') {
      await prisma.user.update({
        where: { id: req.userId },
        data: { subscription: planId }
      });
      
      return res.json({
        message: 'Successfully subscribed (mock)',
        subscription: { planId, status: 'active' }
      });
    }
    
    // ... rest of Stripe code
  }
}
```

## Recommended: Use Free Trial for Now

The free trial is working correctly. For testing, you can:
1. Use the 7-day free trial
2. Get 50 minutes and 50 SMS
3. Purchase phone numbers

This gives you time to properly set up Stripe later.