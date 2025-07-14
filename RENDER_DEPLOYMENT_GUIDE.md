# SmartLine AI Backend - Render.com Deployment Guide

## Overview
This guide will help you deploy the SmartLine AI backend to Render.com, moving from your VPS to a managed platform that handles scaling and reduces CPU issues.

## Pre-deployment Steps

### 1. Create Render Account
- Sign up at [render.com](https://render.com)
- Verify your email

### 2. Prepare Your Repository
- Ensure your code is pushed to GitHub, GitLab, or Bitbucket
- The `render.yaml` file should be in the backend directory

### 3. Required API Keys
Before deployment, have these ready:
- **Twilio**: Account SID, Auth Token, App SID
- **Plivo**: Auth ID, Auth Token, App ID (if using as backup)
- **Stripe**: Secret Key, Publishable Key, Webhook Secret
- **OpenAI**: API Key
- **Email**: SMTP credentials (optional)

## Deployment Steps

### 1. Deploy via Blueprint
1. Go to your Render Dashboard
2. Click "New +" → "Blueprint"
3. Connect your Git repository
4. Select the branch containing your code
5. Choose the `backend/render.yaml` file
6. Click "Apply"

### 2. Configure Environment Variables
After deployment starts, you'll need to set the secret environment variables:

1. Go to each service in your Render dashboard
2. Navigate to "Environment" tab
3. Add these variables:

**For the Web Service (smartline-api):**
```
TWILIO_ACCOUNT_SID=your_actual_sid
TWILIO_AUTH_TOKEN=your_actual_token
TWILIO_APP_SID=your_actual_app_sid
STRIPE_SECRET_KEY=sk_live_or_test_key
STRIPE_WEBHOOK_SECRET=whsec_your_secret
STRIPE_PUBLISHABLE_KEY=pk_live_or_test_key
OPENAI_API_KEY=sk_your_openai_key
```

**For Cron Jobs:**
- Add the same VoIP provider credentials as needed

### 3. Set Up Stripe Webhook
1. After deployment, note your service URL: `https://smartline-api.onrender.com`
2. In Stripe Dashboard:
   - Go to Developers → Webhooks
   - Add endpoint: `https://smartline-api.onrender.com/webhooks/stripe`
   - Select events: `checkout.session.completed`, `customer.subscription.*`
   - Copy the webhook secret to `STRIPE_WEBHOOK_SECRET`

### 4. Configure Twilio/Plivo Webhooks
Update your phone number webhooks to point to:
- Voice: `https://smartline-api.onrender.com/webhooks/twilio/voice`
- SMS: `https://smartline-api.onrender.com/webhooks/twilio/sms`

## Post-deployment

### 1. Run Database Migrations
The migrations run automatically during build, but if needed:
1. Go to your web service
2. Open "Shell" tab
3. Run: `npx prisma migrate deploy`

### 2. Seed Initial Data
To add subscription plans:
1. In the Shell tab, run: `node prisma/seed-plans.js`

### 3. Verify Deployment
- Check health endpoint: `https://smartline-api.onrender.com/api/health`
- Test authentication endpoints
- Verify webhook connectivity

## Monitoring & Troubleshooting

### View Logs
- Go to your service → "Logs" tab
- Filter by timestamp or search for errors

### Common Issues

1. **Database Connection Errors**
   - Ensure database is in the same region as your service
   - Check if IP allowlist is configured correctly

2. **High Memory Usage**
   - Upgrade from free to starter plan ($7/month)
   - Implement better caching strategies

3. **Slow Cold Starts (Free Tier)**
   - Services spin down after 15 minutes of inactivity
   - Consider upgrading to keep service always-on

### Performance Optimization
- Use Redis for session storage and caching
- Implement request queuing for heavy operations
- Monitor usage with Render's metrics dashboard

## Scaling

When ready to scale:
1. **Vertical Scaling**: Upgrade service plan for more CPU/RAM
2. **Horizontal Scaling**: Increase instance count (paid plans)
3. **Database**: Upgrade to larger database plan
4. **Redis**: Increase memory allocation

## Cost Estimation
- **Free Tier**: Good for development/testing
- **Starter**: ~$14/month (Web + DB)
- **Production**: ~$50-100/month depending on usage

## Migration from VPS

To migrate data from your VPS:
1. Export database: `pg_dump your_db > backup.sql`
2. Import to Render DB using connection string
3. Copy any uploaded files to a cloud storage service

## Support
- Render Support: support@render.com
- Documentation: https://render.com/docs
- Status Page: https://status.render.com