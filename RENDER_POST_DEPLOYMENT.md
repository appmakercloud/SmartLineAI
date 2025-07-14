# Post-Deployment Checklist for SmartLine AI on Render

Your backend is now live at: `https://smartline-api-pn16.onrender.com`

## ✅ Immediate Actions Required

### 1. Test the API
```bash
cd backend
./test-render-api.sh
```

### 2. Update Environment Variables in Render Dashboard
Go to your Render Dashboard → smartline-api → Environment

**Required Variables:**
- [ ] `TWILIO_ACCOUNT_SID` - Your Twilio Account SID
- [ ] `TWILIO_AUTH_TOKEN` - Your Twilio Auth Token
- [ ] `TWILIO_APP_SID` - Your TwiML App SID
- [ ] `STRIPE_SECRET_KEY` - Your Stripe Secret Key
- [ ] `STRIPE_PUBLISHABLE_KEY` - Your Stripe Publishable Key
- [ ] `STRIPE_WEBHOOK_SECRET` - Will get after webhook setup
- [ ] `OPENAI_API_KEY` - Your OpenAI API key

**Optional Variables:**
- [ ] `PLIVO_AUTH_ID` - If using Plivo as backup
- [ ] `PLIVO_AUTH_TOKEN` - If using Plivo as backup
- [ ] `SMTP_HOST` - For email notifications
- [ ] `SMTP_USER` - Email username
- [ ] `SMTP_PASS` - Email password

### 3. Configure Webhooks
Follow the [Webhook Configuration Guide](./WEBHOOK_CONFIGURATION.md) to set up:
- Stripe payment webhooks
- Twilio voice/SMS webhooks
- Plivo webhooks (if using)

### 4. Update iOS App
The iOS app configuration has been updated to use the new backend URL.
Rebuild and redeploy your iOS app with the new API endpoint.

### 5. Database Migrations
Migrations run automatically, but verify by checking:
1. Go to Render Dashboard → smartline-api → Logs
2. Look for "Prisma migrations applied successfully"

### 6. Seed Initial Data (if needed)
To add subscription plans:
1. Go to Render Dashboard → smartline-api → Shell
2. Run: `node prisma/seed-plans.js`

## 🔍 Monitoring & Maintenance

### Check Service Health
- API Health: https://smartline-api-pn16.onrender.com/api/health
- Render Status: https://status.render.com

### View Logs
1. Real-time logs: Render Dashboard → Your Service → Logs
2. Filter by:
   - Error logs: Search for "error"
   - API requests: Search for "GET" or "POST"
   - Webhook events: Search for "webhook"

### Monitor Performance
- Response times in Render Metrics
- Memory usage (upgrade if consistently > 80%)
- CPU usage (should be lower than your VPS)

## 🚨 Troubleshooting Common Issues

### 1. "Service Unavailable" or Slow Response
**Cause**: Free tier services sleep after 15 minutes of inactivity
**Solution**: 
- First request will be slow (cold start)
- Upgrade to Starter plan ($7/month) for always-on service

### 2. Database Connection Errors
**Check**:
- Database and service are in the same region
- Database IP allowlist includes `0.0.0.0/0`

### 3. Webhook Failures
**Debug**:
1. Check Render logs for incoming webhook requests
2. Verify webhook URLs in provider dashboards
3. Ensure environment variables are set

### 4. CORS Errors from iOS App
**Fix**: Update CORS_ORIGIN in environment variables to include your app's domain

## 📈 Scaling Recommendations

### When to Upgrade:
1. **Starter Plan ($7/month)**:
   - Consistent traffic throughout the day
   - Need to eliminate cold starts
   - More than 100 active users

2. **Standard Plan ($25/month)**:
   - High traffic (>1000 requests/minute)
   - Need horizontal scaling
   - Mission-critical uptime

3. **Database Scaling**:
   - Free: 1GB storage, good for development
   - Starter: 10GB storage, production-ready
   - Standard: 100GB+ storage, high performance

## 🔐 Security Checklist

- [ ] Change default admin password
- [ ] Rotate JWT secrets
- [ ] Enable 2FA on Render account
- [ ] Set up alerts for failed login attempts
- [ ] Review and limit API rate limits
- [ ] Backup database regularly

## 📊 Cost Optimization

### Current Setup (Free Tier):
- Web Service: $0 (with sleep)
- Database: $0 (90 days, then $7/month)
- Redis: $0 (25MB)
- Total: $0-7/month

### Production Setup (Recommended):
- Web Service: $7/month (always-on)
- Database: $7/month (10GB)
- Redis: $10/month (250MB)
- Total: ~$24/month

## 📞 Support Resources

- Render Support: support@render.com
- Render Docs: https://render.com/docs
- Community: https://community.render.com
- Your Backend Logs: https://dashboard.render.com

## ✨ Next Steps

1. Complete all webhook configurations
2. Test end-to-end flow (iOS app → API → Twilio → iOS app)
3. Set up monitoring alerts
4. Plan for scaling based on user growth
5. Schedule regular backups

Remember to commit and push any configuration changes to your repository!