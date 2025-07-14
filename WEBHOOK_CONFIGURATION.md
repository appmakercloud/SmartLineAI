# Webhook Configuration Guide for SmartLine AI

Now that your backend is deployed at `https://smartline-api-pn16.onrender.com`, you need to configure webhooks for Stripe, Twilio, and Plivo.

## 1. Stripe Webhook Configuration

### Steps:
1. Log in to your [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Developers** → **Webhooks**
3. Click **Add endpoint**
4. Configure as follows:
   - **Endpoint URL**: `https://smartline-api-pn16.onrender.com/webhooks/stripe`
   - **Events to send**: Select the following events:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
5. Click **Add endpoint**
6. Copy the **Signing secret** (starts with `whsec_`)
7. Add this to your Render environment variables as `STRIPE_WEBHOOK_SECRET`

## 2. Twilio Webhook Configuration

### For Voice Calls:
1. Log in to [Twilio Console](https://console.twilio.com)
2. Navigate to **Phone Numbers** → **Manage** → **Active Numbers**
3. Click on each phone number
4. In the **Voice & Fax** section:
   - **A CALL COMES IN**: 
     - Webhook: `https://smartline-api-pn16.onrender.com/webhooks/twilio/voice`
     - HTTP Method: `POST`
   - **CALL STATUS CHANGES**:
     - Webhook: `https://smartline-api-pn16.onrender.com/webhooks/twilio/status`
     - HTTP Method: `POST`

### For SMS/MMS:
1. In the same phone number configuration
2. In the **Messaging** section:
   - **A MESSAGE COMES IN**:
     - Webhook: `https://smartline-api-pn16.onrender.com/webhooks/twilio/sms`
     - HTTP Method: `POST`

### For TwiML App (if using):
1. Navigate to **Voice** → **TwiML** → **TwiML Apps**
2. Create or update your app with:
   - **Voice Request URL**: `https://smartline-api-pn16.onrender.com/webhooks/twilio/voice`
   - **SMS Request URL**: `https://smartline-api-pn16.onrender.com/webhooks/twilio/sms`

## 3. Plivo Webhook Configuration

### For Plivo Application:
1. Log in to [Plivo Console](https://console.plivo.com)
2. Navigate to **Voice** → **Applications**
3. Create or edit your application
4. Configure:
   - **Answer URL**: `https://smartline-api-pn16.onrender.com/webhooks/plivo/answer`
   - **Answer Method**: `POST`
   - **Hangup URL**: `https://smartline-api-pn16.onrender.com/webhooks/plivo/hangup`
   - **Hangup Method**: `POST`

### For Phone Numbers:
1. Navigate to **Phone Numbers** → **Your Numbers**
2. For each number, set:
   - **Application**: Select your configured application
   - **SMS URL**: `https://smartline-api-pn16.onrender.com/webhooks/plivo/sms`

## 4. Testing Webhooks

### Test Stripe Webhook:
```bash
# Use Stripe CLI
stripe listen --forward-to https://smartline-api-pn16.onrender.com/webhooks/stripe
```

### Test Twilio Webhook:
```bash
curl -X POST https://smartline-api-pn16.onrender.com/webhooks/twilio/voice \
  -d "From=+1234567890" \
  -d "To=+0987654321" \
  -d "CallSid=CA1234567890"
```

### Test Plivo Webhook:
```bash
curl -X POST https://smartline-api-pn16.onrender.com/webhooks/plivo/answer \
  -H "Content-Type: application/json" \
  -d '{"From": "1234567890", "To": "0987654321", "CallUUID": "test-call-uuid"}'
```

## 5. Environment Variables Checklist

Make sure these are set in your Render dashboard:

### Required for Webhooks:
- [ ] `STRIPE_WEBHOOK_SECRET` - From Stripe webhook configuration
- [ ] `TWILIO_ACCOUNT_SID` - From Twilio console
- [ ] `TWILIO_AUTH_TOKEN` - From Twilio console
- [ ] `TWILIO_APP_SID` - From TwiML app (if using)
- [ ] `PLIVO_AUTH_ID` - From Plivo console
- [ ] `PLIVO_AUTH_TOKEN` - From Plivo console
- [ ] `PLIVO_APP_ID` - From Plivo application

## 6. Monitoring Webhooks

### View Webhook Logs:
1. **Stripe**: Dashboard → Developers → Webhooks → Click on endpoint → View attempts
2. **Twilio**: Console → Monitor → Logs → Errors/Warnings
3. **Plivo**: Console → Logs → API Logs
4. **Render**: Dashboard → Your Service → Logs

### Common Issues:
- **401 Unauthorized**: Check auth tokens in environment variables
- **404 Not Found**: Verify webhook URLs are correct
- **500 Server Error**: Check Render logs for application errors
- **Timeout**: Render free tier may have cold starts; consider upgrading

## 7. Security Best Practices

1. **Validate Webhook Signatures**:
   - Stripe: Validates automatically with `STRIPE_WEBHOOK_SECRET`
   - Twilio: Validate X-Twilio-Signature header
   - Plivo: Validate with auth credentials

2. **IP Whitelisting** (if supported):
   - Add Twilio/Plivo IP ranges to your security rules

3. **HTTPS Only**:
   - All webhooks use HTTPS by default on Render

4. **Rate Limiting**:
   - Implemented in the application to prevent abuse

## Next Steps

1. Configure all webhooks as described above
2. Test each webhook endpoint
3. Monitor logs for any errors
4. Set up alerting for webhook failures
5. Document any custom webhook logic for your team