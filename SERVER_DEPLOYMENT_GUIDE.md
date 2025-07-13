# SmartLine AI Server Deployment Guide

## Server Details
- **Server IP**: 216.70.74.232
- **Domain**: https://smartlineai.webagencies.com
- **User**: flickmax (use `sudo su` for root)

## What We Did (Step by Step)

### 1. Server Setup
```bash
# Updated system
apt update && apt upgrade -y

# Installed required packages
apt install -y curl git nginx postgresql postgresql-contrib redis-server nodejs npm

# Installed PM2 globally
npm install -g pm2
```

### 2. Database Setup
```bash
# Created PostgreSQL database and user
sudo -u postgres psql
CREATE USER smartline WITH PASSWORD 'smartline_secure_password_2024';
CREATE DATABASE smartline_db OWNER smartline;
GRANT ALL PRIVILEGES ON DATABASE smartline_db TO smartline;
```

### 3. Redis Setup
```bash
# Configured Redis with password
sed -i 's/# requirepass foobared/requirepass smartline_redis_password_2024/g' /etc/redis/redis.conf
systemctl restart redis-server
```

### 4. Application Deployment
```bash
# Created directory
mkdir -p /var/www/smartline-api
cd /var/www/smartline-api

# Extracted backend files from tar.gz
tar -xzf /home/flickmax/smartline-backend.tar.gz

# Created .env file
cat > .env << 'EOF'
NODE_ENV=production
PORT=3000
DATABASE_URL="postgresql://smartline:smartline_secure_password_2024@localhost:5432/smartline_db"
REDIS_URL="redis://:smartline_redis_password_2024@localhost:6379"
JWT_SECRET="[GENERATED_SECRET]"
JWT_REFRESH_SECRET="[GENERATED_SECRET]"
TWILIO_WEBHOOK_URL="https://smartlineai.webagencies.com/webhooks/twilio"
PLIVO_WEBHOOK_URL="https://smartlineai.webagencies.com/webhooks/plivo"
EOF

# Installed dependencies
npm install

# Generated Prisma client and ran migrations
npx prisma generate
npx prisma migrate deploy

# Started with PM2
pm2 start ecosystem.config.js
pm2 save
```

### 5. Nginx Configuration
```bash
# Created Nginx config
echo 'server {
    listen 80;
    server_name smartlineai.webagencies.com www.smartlineai.webagencies.com _;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    client_max_body_size 10M;
}' > /etc/nginx/sites-available/smartline-api

# Enabled site
ln -s /etc/nginx/sites-available/smartline-api /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Restarted Nginx
systemctl restart nginx
```

### 6. Domain & SSL Setup
1. Added domain to Cloudflare
2. Created A record: smartlineai → 216.70.74.232
3. Enabled Cloudflare proxy (orange cloud)
4. Set SSL/TLS to "Flexible" mode

## Working URLs

### API Endpoints
- **Health Check**: https://smartlineai.webagencies.com/health
- **API Base**: https://smartlineai.webagencies.com

### Webhook URLs
```
# Stripe
https://smartlineai.webagencies.com/webhooks/stripe

# Twilio
https://smartlineai.webagencies.com/webhooks/twilio/voice
https://smartlineai.webagencies.com/webhooks/twilio/call-status
https://smartlineai.webagencies.com/webhooks/twilio/sms
https://smartlineai.webagencies.com/webhooks/twilio/sms-status

# Plivo
https://smartlineai.webagencies.com/webhooks/plivo/answer
https://smartlineai.webagencies.com/webhooks/plivo/hangup
https://smartlineai.webagencies.com/webhooks/plivo/incoming-sms
```

## Management Commands

```bash
# Check application status
pm2 status

# View logs
pm2 logs smartline-api

# Restart application
pm2 restart smartline-api

# Monitor in real-time
pm2 monit

# Edit environment variables
nano /var/www/smartline-api/.env

# After editing .env, restart app
pm2 restart smartline-api
```

## File Locations
- **Application**: `/var/www/smartline-api/`
- **Environment**: `/var/www/smartline-api/.env`
- **Nginx Config**: `/etc/nginx/sites-available/smartline-api`
- **Logs**: `/var/www/smartline-api/logs/`

## Database Access
```bash
# Connect to PostgreSQL
psql -U smartline -d smartline_db -h localhost
# Password: smartline_secure_password_2024
```

## Important Notes
1. Server handles HTTP (port 80)
2. Cloudflare handles HTTPS (SSL)
3. No SSL certificates needed on server
4. Always use Cloudflare "Flexible" SSL mode
5. Application runs on 2 PM2 instances in cluster mode

## Troubleshooting
```bash
# If app not responding
pm2 restart smartline-api

# If Nginx issues
nginx -t
systemctl restart nginx

# Check all services
systemctl status nginx
systemctl status postgresql
systemctl status redis-server
pm2 status
```

## Quick Health Check
```bash
# From server
curl http://localhost:3000/health

# From outside
curl https://smartlineai.webagencies.com/health
```