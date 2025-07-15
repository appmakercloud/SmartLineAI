# Stripe Native SDK Setup

## Backend Environment Variables

Add the following environment variable to your Render deployment:

```
STRIPE_PUBLISHABLE_KEY=pk_test_51QQV0GBJzjQZQGJvLkT5PYyBcaT39lXNOhHJR8ojj0SN8vdCEYqGfLLhWqIkhjqx21LrjV0a0JLtC4AZhGTlnJtX00b4eJuXGK
```

This is your Stripe test publishable key that will be sent to the iOS app for the native SDK.

## iOS Setup

1. **Add Stripe SDK to Xcode Project**:
   - Open your Xcode project
   - Go to File > Add Package Dependencies
   - Enter the URL: `https://github.com/stripe/stripe-ios.git`
   - Select version 23.0.0 or later
   - Add the StripePaymentSheet product to your app target

2. **Configure Info.plist** (if needed for 3D Secure):
   Add the following to Info.plist if you want to support 3D Secure authentication:
   ```xml
   <key>LSApplicationQueriesSchemes</key>
   <array>
       <string>stripe</string>
   </array>
   ```

## How the Native Payment Flow Works

1. **User selects a plan** in the iOS app
2. **iOS app requests payment intent** from backend (`/api/subscriptions/payment-intent`)
3. **Backend creates payment intent** with Stripe and returns:
   - Client secret
   - Customer ID
   - Ephemeral key
   - Publishable key
4. **iOS app shows Stripe Payment Sheet** using the native SDK
5. **User enters payment details** in the native UI
6. **Payment is processed** directly with Stripe
7. **iOS app receives result** and updates subscription

## API Endpoints

### Create Payment Intent
```
POST /api/subscriptions/payment-intent
{
  "planId": "starter"
}

Response:
{
  "clientSecret": "pi_xxx_secret_xxx",
  "customerId": "cus_xxx",
  "customerEphemeralKey": "ek_xxx",
  "publishableKey": "pk_test_xxx"
}
```

### Create Setup Intent (for saving cards)
```
POST /api/subscriptions/setup-intent

Response:
{
  "clientSecret": "seti_xxx_secret_xxx",  
  "customerId": "cus_xxx",
  "customerEphemeralKey": "ek_xxx",
  "publishableKey": "pk_test_xxx"
}
```

## Testing

Use these test card numbers:
- Success: 4242 4242 4242 4242
- Requires authentication: 4000 0025 0000 3155
- Declined: 4000 0000 0000 9995

All test cards use:
- Any future expiry date
- Any 3-digit CVC
- Any postal code