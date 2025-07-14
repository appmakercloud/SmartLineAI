# Quick Guide: Create Stripe Products for Testing

## Option 1: Create Products via Stripe Dashboard (Easiest)

1. Go to https://dashboard.stripe.com (make sure you're in **Test mode**)
2. Navigate to **Products** → **Add product**
3. Create these products:

### Starter Plan
- Name: Starter Plan
- Description: 100 minutes, 100 SMS
- Pricing: $19.99/month
- Price ID will be generated (e.g., `price_xxx`)

### Professional Plan
- Name: Professional Plan  
- Description: 500 minutes, 500 SMS
- Pricing: $49.99/month
- Price ID will be generated

### Business Plan
- Name: Business Plan
- Description: 2000 minutes, 2000 SMS  
- Pricing: $99.99/month
- Price ID will be generated

4. After creating, copy the Price IDs and add them to Render environment variables:
```
STRIPE_PRICE_ID_STARTER=price_xxx
STRIPE_PRICE_ID_PROFESSIONAL=price_xxx
STRIPE_PRICE_ID_BUSINESS=price_xxx
```

## Option 2: Use Stripe CLI

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to your account
stripe login

# Create products
stripe products create \
  --name="Starter Plan" \
  --description="100 minutes, 100 SMS"

stripe products create \
  --name="Professional Plan" \
  --description="500 minutes, 500 SMS"

stripe products create \
  --name="Business Plan" \
  --description="2000 minutes, 2000 SMS"

# Create prices (replace prod_xxx with actual product IDs)
stripe prices create \
  --product=prod_xxx \
  --unit-amount=1999 \
  --currency=usd \
  --recurring[interval]=month

stripe prices create \
  --product=prod_xxx \
  --unit-amount=4999 \
  --currency=usd \
  --recurring[interval]=month

stripe prices create \
  --product=prod_xxx \
  --unit-amount=9999 \
  --currency=usd \
  --recurring[interval]=month
```

## Option 3: Temporary Testing Without Products

For immediate testing, update your backend to bypass Stripe:

In `backend/src/services/subscriptionService.js`, add this at the beginning of `subscribeToPlan`:

```javascript
// Temporary bypass for testing
if (process.env.BYPASS_STRIPE === 'true') {
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
      stripeCustomerId: `cus_test_${Date.now()}`
    }
  });
  
  return subscription;
}
```

Then add to Render environment:
```
BYPASS_STRIPE=true
```

This will create test subscriptions without hitting Stripe API.