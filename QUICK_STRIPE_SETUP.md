# Quick Stripe Test Setup

## What I've Done

1. Created `/api/stripe-test/create-test-payment-method` endpoint that creates real Stripe test payment methods
2. Updated iOS app to use this endpoint instead of mock payment methods
3. The backend will now create a test card payment method using Stripe's API

## What You Need to Do

### 1. Add Stripe Test Keys to Render

Go to your Render dashboard and add this environment variable:

```
STRIPE_SECRET_KEY=sk_test_YOUR_TEST_SECRET_KEY
```

You can get this from:
1. Go to https://dashboard.stripe.com
2. Make sure you're in **Test mode** (toggle in top right)
3. Go to Developers → API keys
4. Copy the "Secret key" that starts with `sk_test_`

### 2. Deploy the Backend

Deploy these changes to Render.

### 3. Update iOS App

The iOS app has been updated to:
1. Call the new endpoint to create a test payment method
2. Use that real payment method ID for subscription

### 4. Test It

1. Launch the iOS app
2. Try to subscribe to a plan
3. It will now create a real Stripe test payment method (using card 4242 4242 4242 4242)
4. The subscription should work!

## How It Works

1. iOS app calls `/api/stripe-test/create-test-payment-method`
2. Backend creates a payment method using Stripe's test card
3. Backend returns the real payment method ID (pm_xxx)
4. iOS app uses this ID to subscribe
5. Stripe processes the test subscription

This is a temporary solution for testing. For production, you'll want to:
- Integrate Stripe SDK in iOS app
- Use Stripe Elements or Payment Sheet
- Handle real card input from users