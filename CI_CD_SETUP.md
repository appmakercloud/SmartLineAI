# CI/CD Setup Guide for SmartLine AI

This guide will help you set up automatic deployments using GitHub Actions.

## Overview

The CI/CD pipeline will:
1. Run tests on every push
2. Deploy to your Ubuntu server when pushing to main/master
3. Automatically handle migrations and PM2 restarts
4. Send notifications on deployment status

## Prerequisites

- GitHub repository for your backend code
- Ubuntu server already set up (see UBUNTU_DEPLOYMENT.md)
- SSH access to your server

## Step 1: Prepare Your Server

### 1.1 Create Deploy User (Optional but Recommended)
```bash
# On your Ubuntu server
sudo adduser deploy
sudo usermod -aG sudo deploy
sudo su - deploy
```

### 1.2 Setup SSH Key for GitHub Actions
```bash
# Generate SSH key (on server as deploy user)
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_actions -N ""

# Add to authorized keys
cat ~/.ssh/github_actions.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

# Display private key (you'll need this for GitHub secrets)
cat ~/.ssh/github_actions
```

### 1.3 Configure Git on Server
```bash
cd /var/www/smartline-api

# Initialize git if not already
git init
git remote add origin https://github.com/yourusername/smartline-backend.git

# Set up credentials for pulling
git config credential.helper store
# Do a manual pull once to save credentials
git pull origin main
```

### 1.4 Create Health Check Endpoint
Add this to your Express app (`src/index.js`):
```javascript
// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});
```

## Step 2: Setup GitHub Repository

### 2.1 Create Repository
```bash
# In your local backend folder
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/yourusername/smartline-backend.git
git push -u origin main
```

### 2.2 Add GitHub Secrets
Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these secrets:
- `HOST`: Your server's IP address or domain
- `USERNAME`: SSH username (e.g., 'deploy')
- `SSH_KEY`: The private key content from step 1.2
- `PORT`: SSH port (usually 22)

## Step 3: Create GitHub Actions Workflow

The workflow file has already been created at `.github/workflows/deploy.yml`

## Step 4: Advanced CI/CD Features

### 4.1 Slack Notifications
Add Slack notifications to your workflow:

```yaml
- name: Slack Notification
  uses: 8398a7/action-slack@v3
  if: always()
  with:
    status: ${{ job.status }}
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
    text: |
      Deployment ${{ job.status }}
      Commit: ${{ github.sha }}
      Author: ${{ github.actor }}
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

### 4.2 Blue-Green Deployment
Create a blue-green deployment script on your server:

```bash
nano /home/deploy/blue-green-deploy.sh
```

```bash
#!/bin/bash

# Blue-Green Deployment Script
BLUE_PORT=3000
GREEN_PORT=3001
CURRENT_PORT=$(pm2 jlist | jq -r '.[] | select(.name=="smartline-api") | .pm2_env.PORT')

if [ "$CURRENT_PORT" == "$BLUE_PORT" ]; then
    NEW_PORT=$GREEN_PORT
    OLD_PORT=$BLUE_PORT
else
    NEW_PORT=$BLUE_PORT
    OLD_PORT=$GREEN_PORT
fi

echo "Deploying to port $NEW_PORT..."

# Start new instance
cd /var/www/smartline-api
git pull
npm install
npx prisma generate
npx prisma migrate deploy

# Start on new port
PORT=$NEW_PORT pm2 start ecosystem.config.js --name "smartline-api-staging"

# Health check
sleep 10
if curl -f http://localhost:$NEW_PORT/health; then
    echo "Health check passed"
    
    # Update nginx
    sudo sed -i "s/localhost:$OLD_PORT/localhost:$NEW_PORT/g" /etc/nginx/sites-available/smartline-api
    sudo nginx -t && sudo nginx -s reload
    
    # Stop old instance
    pm2 delete smartline-api
    pm2 restart smartline-api-staging --name smartline-api
    
    echo "Deployment successful"
else
    echo "Health check failed, rolling back"
    pm2 delete smartline-api-staging
    exit 1
fi
```

### 4.3 Database Backup Before Deploy
Add to your workflow:

```yaml
- name: Backup database
  uses: appleboy/ssh-action@v0.1.5
  with:
    host: ${{ secrets.HOST }}
    username: ${{ secrets.USERNAME }}
    key: ${{ secrets.SSH_KEY }}
    script: |
      pg_dump -U smartline smartline_db > /home/deploy/backups/pre-deploy-$(date +%Y%m%d_%H%M%S).sql
```

## Step 5: Setup Monitoring

### 5.1 Add Deployment Tracking
Create deployment tracking in your database:

```sql
-- Add to your Prisma schema
model Deployment {
  id            String   @id @default(cuid())
  version       String
  commitHash    String
  deployedBy    String
  status        String
  deployedAt    DateTime @default(now())
  rollbackFrom  String?
}
```

### 5.2 Post-Deployment Script
```javascript
// scripts/post-deploy.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function trackDeployment() {
  await prisma.deployment.create({
    data: {
      version: process.env.npm_package_version,
      commitHash: process.env.GITHUB_SHA || 'manual',
      deployedBy: process.env.GITHUB_ACTOR || 'manual',
      status: 'success'
    }
  });
}

trackDeployment()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
```

## Step 6: Multiple Environment Setup

### 6.1 Staging Environment
Create a staging workflow (`.github/workflows/deploy-staging.yml`):

```yaml
name: Deploy to Staging

on:
  push:
    branches: [ develop, staging ]

jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Deploy to staging server
      uses: appleboy/ssh-action@v0.1.5
      with:
        host: ${{ secrets.STAGING_HOST }}
        username: ${{ secrets.USERNAME }}
        key: ${{ secrets.SSH_KEY }}
        script: |
          cd /var/www/smartline-api-staging
          git pull origin develop
          npm install
          npx prisma generate
          npx prisma migrate deploy
          pm2 restart smartline-api-staging
```

### 6.2 Environment-Specific Configs
```bash
# .env.production
NODE_ENV=production
API_URL=https://api.smartline.com

# .env.staging
NODE_ENV=staging
API_URL=https://staging-api.smartline.com
```

## Step 7: Rollback Strategy

### 7.1 Manual Rollback Script
```bash
nano /home/deploy/rollback.sh
```

```bash
#!/bin/bash
# Rollback to previous commit

cd /var/www/smartline-api

# Get current and previous commit
CURRENT=$(git rev-parse HEAD)
PREVIOUS=$(git rev-parse HEAD~1)

echo "Rolling back from $CURRENT to $PREVIOUS"

# Backup current state
pg_dump -U smartline smartline_db > /home/deploy/backups/rollback-$(date +%Y%m%d_%H%M%S).sql

# Rollback
git checkout $PREVIOUS
npm install
npx prisma generate
pm2 restart smartline-api

echo "Rollback complete"
```

### 7.2 Automated Rollback on Failure
Add to your deployment workflow:

```yaml
- name: Deploy with rollback
  uses: appleboy/ssh-action@v0.1.5
  with:
    host: ${{ secrets.HOST }}
    username: ${{ secrets.USERNAME }}
    key: ${{ secrets.SSH_KEY }}
    script: |
      cd /var/www/smartline-api
      
      # Save current commit
      PREVIOUS=$(git rev-parse HEAD)
      
      # Deploy
      git pull origin main
      npm install
      npx prisma generate
      npx prisma migrate deploy
      pm2 restart smartline-api
      
      # Health check
      sleep 10
      if ! curl -f http://localhost:3000/health; then
        echo "Health check failed, rolling back"
        git checkout $PREVIOUS
        npm install
        pm2 restart smartline-api
        exit 1
      fi
```

## Step 8: Security Best Practices

### 8.1 Secrets Rotation
```yaml
# .github/workflows/rotate-secrets.yml
name: Rotate Secrets

on:
  schedule:
    - cron: '0 0 1 * *'  # Monthly

jobs:
  rotate:
    runs-on: ubuntu-latest
    steps:
    - name: Rotate JWT secrets
      run: |
        NEW_SECRET=$(openssl rand -base64 32)
        echo "NEW_JWT_SECRET=$NEW_SECRET" >> $GITHUB_ENV
      # Update in your secrets management system
```

### 8.2 Deployment Approval
Add manual approval for production:

```yaml
deploy:
  environment:
    name: production
    url: https://api.smartline.com
  needs: test
  runs-on: ubuntu-latest
  steps:
    # ... deployment steps
```

## Testing Your CI/CD

1. **Test locally first:**
   ```bash
   git add .
   git commit -m "Test CI/CD"
   git push origin main
   ```

2. **Monitor in GitHub:**
   - Go to Actions tab in your repository
   - Watch the workflow execution
   - Check logs for any errors

3. **Verify deployment:**
   ```bash
   curl https://your-domain.com/health
   ```

## Troubleshooting

### SSH Connection Failed
- Verify SSH key is correct in GitHub secrets
- Check if port 22 is open on server
- Ensure user has permissions

### Build Failures
- Check Node.js version matches
- Verify all environment variables are set
- Check Prisma schema is valid

### Deployment Success but App Not Working
- Check PM2 logs: `pm2 logs smartline-api`
- Verify environment variables on server
- Check nginx configuration

## Next Steps

1. **Add more tests** to ensure quality
2. **Setup monitoring** with services like Datadog or New Relic
3. **Implement feature flags** for gradual rollouts
4. **Add performance testing** in CI pipeline
5. **Setup database migrations review** process

Your CI/CD pipeline is now ready! Every push to main will automatically deploy to your Ubuntu server 🚀