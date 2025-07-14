# Stripe Test Mode Setup Guide

## 1. Get Stripe Test API Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Make sure you're in **Test mode** (toggle in the top right)
3. Go to Developers → API keys
4. Copy your test keys:
   - **Publishable key**: `pk_test_...`
   - **Secret key**: `sk_test_...`

## 2. Add to Render Environment Variables

In your Render dashboard, add these environment variables:

```
STRIPE_SECRET_KEY=sk_test_YOUR_TEST_SECRET_KEY
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_TEST_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET (optional for now)
```

## 3. Your Stripe Product IDs

Based on your previous setup, you already have these test products:

```
STRIPE_PRODUCT_ID_STARTER=prod_RQCqfmJV2jxqor
STRIPE_PRODUCT_ID_PROFESSIONAL=prod_RQCqiOJyHdgmbx
STRIPE_PRODUCT_ID_BUSINESS=prod_RQCqkZxlnBNnQb

STRIPE_PRICE_ID_STARTER=price_1QVzwQRwI9tctJBu5lHmp2w4
STRIPE_PRICE_ID_PROFESSIONAL=price_1QVzxjRwI9tctJBuEOqQJQvl
STRIPE_PRICE_ID_BUSINESS=price_1QVzyTRwI9tctJBuPsHNXOYA
```

Add these to Render environment variables as well.

## 4. Test Payment Methods

In Stripe test mode, use these test card numbers:

### Successful Payment Cards:
- `4242 4242 4242 4242` - Visa (most common test card)
- `5555 5555 5555 4444` - Mastercard
- `3782 822463 10005` - American Express

### Test Failure Scenarios:
- `4000 0000 0000 0002` - Card declined
- `4000 0000 0000 9995` - Insufficient funds
- `4000 0000 0000 0069` - Expired card

**Important**: 
- Use any future expiry date (e.g., 12/34)
- Use any 3-digit CVC (e.g., 123)
- Use any 5-digit ZIP code (e.g., 12345)

## 5. iOS App Configuration

Your iOS app is currently sending mock payment method IDs (`pm_mock_...`). To use Stripe test mode:

1. **Integrate Stripe iOS SDK** in your iOS app
2. **Initialize Stripe** with your test publishable key:
   ```swift
   STPAPIClient.shared.publishableKey = "pk_test_YOUR_KEY"
   ```

3. **Create Payment Methods** using Stripe SDK:
   ```swift
   // Example with test card
   let cardParams = STPCardParams()
   cardParams.number = "4242424242424242"
   cardParams.expMonth = 12
   cardParams.expYear = 34
   cardParams.cvc = "123"
   
   STPAPIClient.shared.createPaymentMethod(with: cardParams) { paymentMethod, error in
       // Use paymentMethod.stripeId
   }
   ```

## 6. Quick Test with cURL

Test your subscription endpoint with a Stripe test payment method:

```bash
# First, create a test payment method using Stripe API
curl https://api.stripe.com/v1/payment_methods \
  -u sk_test_YOUR_SECRET_KEY: \
  -d type=card \
  -d "card[number]=4242424242424242" \
  -d "card[exp_month]=12" \
  -d "card[exp_year]=2034" \
  -d "card[cvc]=123"

# Use the returned pm_xxx ID in your subscription request
curl -X POST https://smartline-api-pn16.onrender.com/api/subscriptions/subscribe \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "planId": "starter",
    "paymentMethodId": "pm_xxx_from_above"
  }'
```

## 7. Monitor in Stripe Dashboard

1. Go to Stripe Dashboard (in test mode)
2. Check Payments → All payments
3. Check Customers → All customers
4. Check Billing → Subscriptions

All test transactions will appear here with a "TEST" badge.

## 8. Common Issues

1. **"No such payment_method"**: Make sure the payment method was created with the same Stripe account
2. **"API key not found"**: Check that your secret key starts with `sk_test_`
3. **"Customer not found"**: The user might not have a Stripe customer ID yet

## Next Steps

1. Add the Stripe test keys to Render
2. Deploy your backend
3. Update iOS app to use Stripe SDK
4. Test with the test card numbers above

Remember: In test mode, no real charges occur, but the full payment flow is simulated!