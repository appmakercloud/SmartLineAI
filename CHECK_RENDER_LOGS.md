# Check Render Logs for Registration Error

Your API is working correctly:
- ✅ Database tables created
- ✅ Login endpoint working (returns proper error)
- ✅ Rate limiting working
- ❌ Registration returning "Registration failed"

## Check the Logs

1. **Go to Render Dashboard**
   - Navigate to your service
   - Click **Logs** tab

2. **Search for these patterns**:
   ```
   Registration error
   error: Registration
   Registration failed
   ```

3. **Common Registration Failures**:

   ### a) Stripe Integration Error
   Look for: `Stripe error` or `stripe is not defined`
   
   **Fix**: Comment out Stripe code in registration or add Stripe keys

   ### b) Email Service Error
   Look for: `Email error` or `SMTP`
   
   **Fix**: Email sending might be optional, check if it's blocking registration

   ### c) Missing Environment Variable
   Look for: `undefined` or `Cannot read property`
   
   **Fix**: Add missing environment variables

## Quick Test Without Rate Limit

Wait a few minutes for rate limit to reset, then try:

```bash
# From a different IP or wait 15 minutes
curl -X POST https://smartline-api-pn16.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"newtest@example.com","password":"Pass123!","name":"Test"}'
```

## Possible Quick Fixes

### 1. If Stripe is the issue:
In Render Shell:
```bash
# Check if Stripe keys are set
echo $STRIPE_SECRET_KEY
echo $STRIPE_PUBLISHABLE_KEY
```

### 2. Check the actual error:
Look at the registration endpoint in the logs when it fails.

### 3. Test database write:
In Render Shell:
```bash
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.user.create({
  data: {
    email: 'test@test.com',
    passwordHash: 'test',
    subscription: 'free'
  }
}).then(console.log).catch(console.error);
"
```

## What to Look For in Logs

The actual error should appear right after you see:
```
POST /api/auth/register
```

It might be:
- `StripeInvalidRequestError`
- `Cannot read property 'create' of undefined`
- `Missing required parameter`
- `SMTP connection failed`

Share the specific error from the logs and I can help fix it!