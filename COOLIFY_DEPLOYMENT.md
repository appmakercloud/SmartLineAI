# SmartLine AI - Coolify Deployment Guide

This guide will help you deploy SmartLine AI backend using Coolify.

## Prerequisites

- A server with Coolify installed
- GitHub repository with your code
- Domain name (optional but recommended)

## Step 1: Prepare Your GitHub Repository

1. **Create a new GitHub repository:**
```bash
cd /Users/ashokparmar/Develpers/SmartLine\ AI/backend
git init
git add .
git commit -m "Initial commit - Ready for Coolify deployment"
git branch -M main
git remote add origin https://github.com/yourusername/smartline-backend.git
git push -u origin main
```

2. **Ensure these files are in your repository:**
- ✅ `Dockerfile` (created)
- ✅ `docker-compose.yml` (created)
- ✅ `.dockerignore` (created)
- ✅ `package.json`
- ✅ `prisma/schema.prisma`

## Step 2: Configure Coolify

### 2.1 Add New Resource

1. Log into your Coolify dashboard
2. Click **"+ New Resource"**
3. Select **"Public Repository"** (or Private if using SSH key)
4. Enter your GitHub repository URL

### 2.2 Configure Build Settings

1. **Build Pack**: Select "Docker Compose"
2. **Branch**: main
3. **Port**: 3000
4. **Health Check Path**: /health

### 2.3 Environment Variables

Add these environment variables in Coolify:

```env
# Database (Coolify manages these automatically)
DATABASE_URL=postgresql://smartline:your_password@postgres:5432/smartline_db
REDIS_URL=redis://redis:6379

# Security
JWT_SECRET=your-super-secure-jwt-secret-change-this
JWT_REFRESH_SECRET=your-super-secure-refresh-secret-change-this

# VoIP Providers
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_WEBHOOK_URL=https://your-domain.coolify.app/api/webhooks/twilio

PLIVO_AUTH_ID=your_plivo_auth_id
PLIVO_AUTH_TOKEN=your_plivo_auth_token
PLIVO_WEBHOOK_URL=https://your-domain.coolify.app/api/webhooks/plivo

# Payment
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# AI
OPENAI_API_KEY=your_openai_api_key

# App Settings
NODE_ENV=production
PORT=3000
```

### 2.4 Persistent Storage

In Coolify, add these volumes:
- `/app/uploads` → For file uploads
- PostgreSQL and Redis data are automatically persisted

## Step 3: Deploy

1. Click **"Deploy"** in Coolify
2. Watch the build logs
3. Once deployed, you'll get a URL like: `https://smartline-api.your-coolify-domain.com`

## Step 4: Post-Deployment Setup

### 4.1 Run Database Migrations

Coolify should automatically run migrations via the Dockerfile CMD, but if needed:

1. Go to your application in Coolify
2. Click **"Execute Command"**
3. Run: `npx prisma migrate deploy`

### 4.2 Create Admin User (Optional)

```bash
# In Coolify's Execute Command
npx prisma db seed
```

### 4.3 Configure Webhooks

Update your Twilio/Plivo webhook URLs to point to your Coolify domain:
- Twilio: `https://your-app.coolify.app/api/webhooks/twilio/voice`
- Plivo: `https://your-app.coolify.app/api/webhooks/plivo/voice`

## Step 5: Update iOS App

Update your iOS app to use the Coolify URL:

```swift
// In APIClient.swift
#if DEBUG
self.baseURL = URL(string: "http://localhost:3000")!
#else
self.baseURL = URL(string: "https://smartline-api.your-coolify-domain.com")!
#endif
```

## Step 6: Monitoring & Logs

### View Logs
1. In Coolify dashboard, go to your application
2. Click **"Logs"** to see real-time logs

### Health Checks
Coolify automatically monitors the `/health` endpoint

### Database Backups
1. Go to your PostgreSQL service in Coolify
2. Enable automatic backups
3. Set backup schedule

## Advanced Configuration

### 1. Custom Domain

1. In Coolify, go to your application
2. Click **"Domains"**
3. Add your custom domain: `api.yourdomain.com`
4. Coolify will automatically generate SSL certificates

### 2. Scaling

In your application settings:
- **Replicas**: Increase for horizontal scaling
- **Resources**: Adjust CPU/Memory limits

### 3. CI/CD with Coolify

Coolify supports automatic deployments:
1. Enable **"Auto Deploy"** in your application settings
2. Every push to main branch will trigger a deployment

### 4. Environment-Specific Deployments

Create multiple applications in Coolify:
- **Production**: Connected to `main` branch
- **Staging**: Connected to `develop` branch

## Troubleshooting

### Build Fails
```bash
# Check Dockerfile syntax
docker build -t smartline-test .

# Test locally
docker-compose up
```

### Database Connection Issues
- Ensure DATABASE_URL uses `postgres` as hostname (not localhost)
- Check PostgreSQL service is running in Coolify

### Application Crashes
1. Check logs in Coolify
2. Verify all environment variables are set
3. Ensure migrations ran successfully

### Memory Issues
- Increase memory limits in Coolify
- Check for memory leaks with: `pm2 monit`

## Optimization Tips

1. **Enable Buildkit**: Faster Docker builds
2. **Use Multi-stage builds**: Smaller images (already implemented)
3. **Enable Redis persistence**: For session management
4. **Set up CDN**: For static assets
5. **Configure rate limiting**: Protect your API

## Security Checklist

- [ ] Change all default passwords
- [ ] Use strong JWT secrets
- [ ] Enable Coolify's firewall rules
- [ ] Set up fail2ban on server
- [ ] Regular backups enabled
- [ ] SSL certificates active
- [ ] Environment variables secured

## Coolify-Specific Features

### 1. One-Click Backups
- Enable in PostgreSQL settings
- Set retention period

### 2. Monitoring
- Built-in metrics dashboard
- Set up alerts for downtime

### 3. Logs Management
- Automatic log rotation
- Search and filter capabilities

### 4. Team Collaboration
- Invite team members
- Set role-based permissions

## Commands Cheat Sheet

```bash
# View logs
coolify logs smartline-api

# Execute command in container
coolify exec smartline-api "npx prisma studio"

# Restart application
coolify restart smartline-api

# Scale application
coolify scale smartline-api 3
```

Your SmartLine AI backend is now deployed with Coolify! 🚀

## Next Steps

1. Test all API endpoints
2. Set up monitoring alerts
3. Configure backup strategy
4. Plan for scaling
5. Update iOS app with new URL