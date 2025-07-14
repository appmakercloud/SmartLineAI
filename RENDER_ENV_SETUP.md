# Environment Variables Setup for Render

Based on the test results, your API is running but missing critical environment variables. Here's what you need to set in Render Dashboard:

## 🚨 Critical Variables (Must Set Immediately)

Go to Render Dashboard → Your Service → Environment → Add these:

### Authentication (REQUIRED)
```
JWT_SECRET=your-super-secret-jwt-key-at-least-32-characters-long
JWT_REFRESH_SECRET=another-super-secret-key-at-least-32-characters-long
```

### Database (Should be auto-set, but verify)
```
DATABASE_URL=postgresql://... (This should already be set by Render)
```

### Redis (Should be auto-set, but verify)
```
REDIS_URL=redis://... (This should already be set by Render)
```

## 📝 Step-by-Step Instructions

1. **Go to Render Dashboard**
   - https://dashboard.render.com
   - Click on "smartline-api-pn16"

2. **Navigate to Environment**
   - Click "Environment" in the left sidebar
   - Click "Add Environment Variable"

3. **Add JWT Variables** (minimum required):
   ```
   Key: JWT_SECRET
   Value: any-random-string-32chars-or-more-keep-this-secret
   
   Key: JWT_REFRESH_SECRET  
   Value: different-random-string-32chars-or-more-also-secret
   ```

4. **Add Provider Variables** (for full functionality):
   ```
   Key: TWILIO_ACCOUNT_SID
   Value: Your Twilio Account SID (from Twilio Console)
   
   Key: TWILIO_AUTH_TOKEN
   Value: Your Twilio Auth Token (from Twilio Console)
   
   Key: STRIPE_SECRET_KEY
   Value: Your Stripe Secret Key (sk_test_... or sk_live_...)
   
   Key: OPENAI_API_KEY
   Value: Your OpenAI API Key (sk-...)
   ```

5. **Save and Deploy**
   - Click "Save Changes"
   - Service will automatically redeploy

## 🔍 How to Generate Secure Secrets

### Option 1: Use OpenSSL (in terminal)
```bash
# Generate JWT_SECRET
openssl rand -base64 32

# Generate JWT_REFRESH_SECRET
openssl rand -base64 32
```

### Option 2: Use Node.js
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Option 3: Use an online generator
Visit: https://generate-secret.vercel.app/32

## ✅ Verify Setup

After adding variables and waiting for redeploy (2-3 minutes):

```bash
# Run the test again
cd backend
./test-render-api.sh
```

You should see:
- Registration: Success (201)
- Login: Success or "Invalid credentials" (not 500)

## 🐛 Still Getting Errors?

Check these in order:

1. **Database Connection**
   - Is DATABASE_URL set?
   - Check logs for "database" errors
   - Try manually in Shell: `npx prisma db push`

2. **Missing Tables**
   - In Render Shell, run: `npx prisma migrate deploy`
   - Then: `npx prisma db seed`

3. **Redis Issues**
   - Is REDIS_URL set?
   - Is Redis service running?

4. **View Detailed Logs**
   - Go to Logs tab
   - Search for: "error" or "Error:"
   - Look for first error after "Server started"

## 🎯 Quick Test After Setup

```bash
# Test registration
curl -X POST https://smartline-api-pn16.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"newuser@test.com","password":"TestPass123!"}'
```

Should return:
```json
{
  "user": {...},
  "token": "...",
  "refreshToken": "..."
}
```