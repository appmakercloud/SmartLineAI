# SmartLine AI Deployment Guide

## Prerequisites

- Node.js 18+ installed
- PostgreSQL database
- GitHub account
- Render.com account
- Twilio account for VoIP services (primary)
- Plivo account for VoIP services (backup/optional)
- Stripe account for payments
- OpenAI API key for AI features

## Local Development Setup

1. **Clone and Install**
   ```bash
   cd "SmartLine AI"
   ./setup.sh
   ```

2. **Configure Environment**
   Edit `backend/.env` with your credentials:
   ```
   DATABASE_URL=postgresql://user:password@localhost:5432/smartlineai
   
   # Primary VoIP Provider
   DEFAULT_VOIP_PROVIDER=twilio
   TWILIO_ACCOUNT_SID=your_twilio_account_sid
   TWILIO_AUTH_TOKEN=your_twilio_auth_token
   
   # Backup VoIP Provider (optional)
   PLIVO_AUTH_ID=your_plivo_auth_id
   PLIVO_AUTH_TOKEN=your_plivo_auth_token
   
   STRIPE_SECRET_KEY=your_stripe_secret_key
   OPENAI_API_KEY=your_openai_api_key
   ```

3. **Database Setup**
   ```bash
   cd backend
   npm run migrate:dev
   npm run seed  # Optional: adds test data
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

## Deployment to Render.com

### 1. Prepare for Deployment

1. **Initialize Git Repository**
   ```bash
   git init
   git add .
   git commit -m "Initial commit - SmartLine AI"
   ```

2. **Create GitHub Repository**
   - Go to GitHub and create a new repository
   - Push your code:
   ```bash
   git remote add origin https://github.com/yourusername/smartline-ai.git
   git branch -M main
   git push -u origin main
   ```

### 2. Deploy on Render

1. **Sign up/Login to Render.com**
   - Go to [render.com](https://render.com)
   - Connect your GitHub account

2. **Create New Blueprint**
   - Click "New +" → "Blueprint"
   - Select your SmartLine AI repository
   - Render will detect the `render.yaml` file

3. **Configure Environment Variables**
   After deployment, go to each service's dashboard and add:
   
   **For smartline-api service:**
   ```
   # Twilio (Primary)
   TWILIO_ACCOUNT_SID=your_twilio_account_sid
   TWILIO_AUTH_TOKEN=your_twilio_auth_token
   
   # Plivo (Optional/Backup)
   PLIVO_AUTH_ID=your_plivo_auth_id
   PLIVO_AUTH_TOKEN=your_plivo_auth_token
   PLIVO_APP_ID=your_plivo_app_id
   
   # Other Services
   STRIPE_SECRET_KEY=your_stripe_secret_key
   STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
   OPENAI_API_KEY=your_openai_api_key
   ```

### 3. Configure VoIP Providers

#### Twilio Setup (Primary)

1. **Create Twilio Phone Numbers**
   - Log in to Twilio Console
   - Buy phone numbers for your service
   - Configure each number with webhooks:
     ```
     Voice URL: https://smartline-api.onrender.com/webhooks/twilio/voice
     Voice Method: POST
     SMS URL: https://smartline-api.onrender.com/webhooks/twilio/sms
     SMS Method: POST
     ```

2. **Get Credentials**
   - Account SID from Dashboard
   - Auth Token from Dashboard
   - Update in Render environment variables

#### Plivo Setup (Optional/Backup)

1. **Create Plivo Application**
   - Log in to Plivo Console
   - Create new application
   - Set webhooks:
     ```
     Answer URL: https://smartline-api.onrender.com/webhooks/plivo/answer
     Hangup URL: https://smartline-api.onrender.com/webhooks/plivo/hangup
     Message URL: https://smartline-api.onrender.com/webhooks/plivo/incoming-sms
     ```

2. **Update Environment**
   - Copy the Application ID
   - Update PLIVO_APP_ID in Render dashboard

### 4. Configure Stripe

1. **Set up Webhook**
   - In Stripe Dashboard → Webhooks
   - Add endpoint: `https://smartline-api.onrender.com/webhooks/stripe`
   - Select events: `checkout.session.completed`
   - Copy webhook secret to STRIPE_WEBHOOK_SECRET

### 5. Post-Deployment

1. **Run Migrations**
   - Render will automatically run migrations on deploy
   - Check logs to ensure success

2. **Test Endpoints**
   ```bash
   # Health check
   curl https://smartline-api.onrender.com/health
   
   # Should return:
   # {"status":"ok","service":"SmartLine AI","timestamp":"...","environment":"production"}
   ```

## Monitoring & Maintenance

### Logs
- View real-time logs in Render dashboard
- Each service has its own log stream

### Database Backups
- Render automatically backs up databases daily
- Manual backups available in database dashboard

### Scaling
- Upgrade from free to paid plans when needed:
  - Web Service: $7/month for always-on
  - Database: $7/month after 90-day free trial
  - Redis: $10/month for 250MB

### Cron Jobs
- `smartline-cleanup`: Runs daily at 2 AM
- `smartline-expire-numbers`: Runs every 6 hours

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check DATABASE_URL format
   - Ensure database is active
   - Check connection limits

2. **Plivo Webhooks Not Working**
   - Verify webhook URLs in Plivo dashboard
   - Check webhook signature validation
   - Review webhook logs

3. **Stripe Payment Issues**
   - Verify webhook endpoint
   - Check webhook secret
   - Test with Stripe CLI locally

### Support

For issues or questions:
- Check Render status: status.render.com
- Review logs in Render dashboard
- Contact support@smartlineai.com

## Production Checklist

- [ ] Environment variables configured
- [ ] Database migrations successful
- [ ] Plivo webhooks configured
- [ ] Stripe webhooks configured
- [ ] SSL certificate active (automatic on Render)
- [ ] Health check endpoint working
- [ ] Test call functionality
- [ ] Test SMS functionality
- [ ] Test payment flow
- [ ] Monitor error logs
- [ ] Set up alerts (optional)

## Next Steps

1. **iOS App Development**
   - Implement CallKit integration
   - Configure push notifications
   - Submit to App Store

2. **Marketing Website**
   - Create landing page
   - Set up analytics
   - Launch marketing campaigns

3. **Customer Support**
   - Set up help desk
   - Create documentation
   - Build knowledge base