# SmartLine AI Backend - Ubuntu Server Deployment Guide

## Prerequisites

- Ubuntu Server 20.04 or 22.04 LTS
- Root or sudo access
- Domain name (optional, for SSL)

## Step 1: Server Setup

### 1.1 Update System
```bash
sudo apt update && sudo apt upgrade -y
```

### 1.2 Install Node.js (v18+)
```bash
# Install NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# Install Node.js
sudo apt install -y nodejs

# Verify installation
node --version
npm --version
```

### 1.3 Install PostgreSQL
```bash
# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql << EOF
CREATE USER smartline WITH PASSWORD 'your_secure_password';
CREATE DATABASE smartline_db OWNER smartline;
GRANT ALL PRIVILEGES ON DATABASE smartline_db TO smartline;
EOF
```

### 1.4 Install Redis
```bash
# Install Redis
sudo apt install -y redis-server

# Configure Redis (optional - for production)
sudo nano /etc/redis/redis.conf
# Set: supervised systemd
# Set: requirepass your_redis_password

# Restart Redis
sudo systemctl restart redis-server
sudo systemctl enable redis-server
```

### 1.5 Install PM2 (Process Manager)
```bash
sudo npm install -g pm2
```

## Step 2: Deploy Application

### 2.1 Create App Directory
```bash
# Create app directory
sudo mkdir -p /var/www/smartline-api
sudo chown $USER:$USER /var/www/smartline-api
cd /var/www/smartline-api
```

### 2.2 Clone/Upload Your Code
```bash
# Option 1: Clone from Git
git clone https://github.com/yourusername/smartline-backend.git .

# Option 2: Upload via SCP (from your local machine)
scp -r /Users/ashokparmar/Develpers/SmartLine\ AI/backend/* user@your-server:/var/www/smartline-api/
```

### 2.3 Install Dependencies
```bash
cd /var/www/smartline-api
npm install
```

### 2.4 Create Environment File
```bash
nano .env
```

Add the following content:
```env
# Server Configuration
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL="postgresql://smartline:your_secure_password@localhost:5432/smartline_db"

# Redis
REDIS_URL="redis://:your_redis_password@localhost:6379"

# JWT Secrets
JWT_SECRET="your-super-secure-jwt-secret"
JWT_REFRESH_SECRET="your-super-secure-refresh-secret"

# VoIP Providers
TWILIO_ACCOUNT_SID="your_twilio_account_sid"
TWILIO_AUTH_TOKEN="your_twilio_auth_token"
TWILIO_WEBHOOK_URL="https://your-domain.com/api/webhooks/twilio"

PLIVO_AUTH_ID="your_plivo_auth_id"
PLIVO_AUTH_TOKEN="your_plivo_auth_token"
PLIVO_WEBHOOK_URL="https://your-domain.com/api/webhooks/plivo"

# Payment
STRIPE_SECRET_KEY="your_stripe_secret_key"
STRIPE_WEBHOOK_SECRET="your_stripe_webhook_secret"

# AI Services
OPENAI_API_KEY="your_openai_api_key"

# Email (Optional)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"

# Monitoring (Optional)
SENTRY_DSN="your_sentry_dsn"
```

### 2.5 Run Database Migrations
```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Seed database (optional)
npx prisma db seed
```

## Step 3: Setup PM2

### 3.1 Create PM2 Ecosystem File
```bash
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [{
    name: 'smartline-api',
    script: './src/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

### 3.2 Start Application
```bash
# Create logs directory
mkdir -p logs

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup systemd -u $USER --hp /home/$USER
```

## Step 4: Setup Nginx Reverse Proxy

### 4.1 Install Nginx
```bash
sudo apt install -y nginx
```

### 4.2 Create Nginx Configuration
```bash
sudo nano /etc/nginx/sites-available/smartline-api
```

```nginx
server {
    listen 80;
    server_name your-domain.com api.your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 4.3 Enable Site
```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/smartline-api /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

## Step 5: Setup SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com -d api.your-domain.com

# Auto-renewal is set up automatically
```

## Step 6: Configure Firewall

```bash
# Allow SSH, HTTP, and HTTPS
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'

# Enable firewall
sudo ufw enable
```

## Step 7: Setup Monitoring

### 7.1 PM2 Monitoring
```bash
# View logs
pm2 logs smartline-api

# Monitor processes
pm2 monit

# View status
pm2 status
```

### 7.2 System Monitoring (Optional)
```bash
# Install htop
sudo apt install -y htop

# Install netdata (optional)
bash <(curl -Ss https://my-netdata.io/kickstart.sh)
```

## Step 8: Backup Strategy

### 8.1 Database Backup Script
```bash
nano /home/$USER/backup-db.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/home/$USER/backups"
mkdir -p $BACKUP_DIR

# Backup PostgreSQL
pg_dump -U smartline smartline_db > "$BACKUP_DIR/smartline_db_$(date +%Y%m%d_%H%M%S).sql"

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
```

```bash
chmod +x /home/$USER/backup-db.sh

# Add to crontab (daily at 3 AM)
crontab -e
# Add: 0 3 * * * /home/$USER/backup-db.sh
```

## Step 9: Update iOS App Configuration

Update your iOS app to point to your server:

1. In `APIClient.swift`, update the production URL:
```swift
#if DEBUG
self.baseURL = URL(string: "http://localhost:3000")!
#else
self.baseURL = URL(string: "https://your-domain.com")!
#endif
```

## Maintenance Commands

```bash
# View logs
pm2 logs smartline-api

# Restart application
pm2 restart smartline-api

# Update application
cd /var/www/smartline-api
git pull
npm install
npx prisma migrate deploy
pm2 restart smartline-api

# Monitor resources
htop

# Check disk space
df -h

# Check PostgreSQL
sudo -u postgres psql -d smartline_db

# Check Redis
redis-cli ping
```

## Security Checklist

- [ ] Change default PostgreSQL password
- [ ] Set Redis password
- [ ] Use strong JWT secrets
- [ ] Enable UFW firewall
- [ ] Keep system updated
- [ ] Setup fail2ban (optional)
- [ ] Regular backups
- [ ] Monitor logs
- [ ] Use environment variables for secrets
- [ ] Enable SSL/TLS

## Troubleshooting

### Application won't start
```bash
# Check logs
pm2 logs smartline-api
# Check if port is in use
sudo lsof -i :3000
```

### Database connection issues
```bash
# Check PostgreSQL status
sudo systemctl status postgresql
# Test connection
psql -U smartline -d smartline_db -h localhost
```

### High memory usage
```bash
# Restart PM2
pm2 restart smartline-api
# Check memory
free -m
```

## Performance Optimization

1. **Enable Gzip in Nginx**
2. **Use Redis for sessions**
3. **Enable PM2 cluster mode**
4. **Set up CDN for static assets**
5. **Database indexing**
6. **Rate limiting**

Your SmartLine AI backend is now deployed on Ubuntu! 🚀