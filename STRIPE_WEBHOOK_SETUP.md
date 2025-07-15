# Stripe Webhook Configuration

## Important: Set up Stripe Webhook

For the subscription to be created after payment, you need to configure the webhook in your Stripe dashboard:

### 1. Go to Stripe Dashboard
- Log in to https://dashboard.stripe.com/test/webhooks
- Click "Add endpoint"

### 2. Configure Webhook Endpoint
- **Endpoint URL**: `https://smartline-api-pn16.onrender.com/api/subscriptions/webhook`
- **Description**: SmartLine AI Subscription Webhook

### 3. Select Events to Listen
Select these events:
- `payment_intent.succeeded` ✅ (Required for subscription creation)
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

### 4. Get Webhook Secret
After creating the webhook:
1. Click on the webhook you just created
2. Click "Reveal" under "Signing secret"
3. Copy the webhook secret (starts with `whsec_`)
4. Add it to Render environment variables:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
   ```

## Alternative: Direct Subscription Creation

If webhooks are not working, we can modify the flow to create the subscription directly after payment confirmation in the iOS app.