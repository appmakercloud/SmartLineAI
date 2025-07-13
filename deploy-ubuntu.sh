#!/bin/bash

# SmartLine AI Backend - Ubuntu Deployment Script
# This script automates the deployment process

set -e  # Exit on error

echo "================================================"
echo "SmartLine AI Backend Deployment Script"
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}→ $1${NC}"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   print_error "This script must be run as root"
   echo "Please run: sudo bash deploy-ubuntu.sh"
   exit 1
fi

print_info "Starting deployment process..."

# Update system
print_info "Updating system packages..."
apt update && apt upgrade -y
print_success "System updated"

# Install required packages
print_info "Installing required packages..."
apt install -y curl git nginx postgresql postgresql-contrib redis-server ufw fail2ban

# Install Node.js 18
print_info "Installing Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs
print_success "Node.js $(node --version) installed"

# Install PM2
print_info "Installing PM2..."
npm install -g pm2
print_success "PM2 installed"

# Setup PostgreSQL
print_info "Setting up PostgreSQL..."
sudo -u postgres psql << EOF
CREATE USER smartline WITH PASSWORD 'smartline_secure_password_2024';
CREATE DATABASE smartline_db OWNER smartline;
GRANT ALL PRIVILEGES ON DATABASE smartline_db TO smartline;
EOF
print_success "PostgreSQL database created"

# Setup Redis
print_info "Configuring Redis..."
sed -i 's/supervised no/supervised systemd/g' /etc/redis/redis.conf
sed -i 's/# requirepass foobared/requirepass smartline_redis_password_2024/g' /etc/redis/redis.conf
systemctl restart redis-server
systemctl enable redis-server
print_success "Redis configured"

# Create application directory
print_info "Creating application directory..."
mkdir -p /var/www/smartline-api
chown -R $SUDO_USER:$SUDO_USER /var/www/smartline-api
print_success "Application directory created"

# Create environment file
print_info "Creating environment configuration..."
cat > /var/www/smartline-api/.env << 'EOF'
# Server Configuration
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL="postgresql://smartline:smartline_secure_password_2024@localhost:5432/smartline_db"

# Redis
REDIS_URL="redis://:smartline_redis_password_2024@localhost:6379"

# JWT Secrets (CHANGE THESE!)
JWT_SECRET="your-super-secure-jwt-secret-change-this"
JWT_REFRESH_SECRET="your-super-secure-refresh-secret-change-this"

# VoIP Providers (Add your credentials)
TWILIO_ACCOUNT_SID=""
TWILIO_AUTH_TOKEN=""
TWILIO_WEBHOOK_URL=""

PLIVO_AUTH_ID=""
PLIVO_AUTH_TOKEN=""
PLIVO_WEBHOOK_URL=""

# Payment (Optional)
STRIPE_SECRET_KEY=""
STRIPE_WEBHOOK_SECRET=""

# AI Services (Optional)
OPENAI_API_KEY=""
EOF

chown $SUDO_USER:$SUDO_USER /var/www/smartline-api/.env
chmod 600 /var/www/smartline-api/.env
print_success "Environment file created"

# Setup Nginx
print_info "Configuring Nginx..."
cat > /etc/nginx/sites-available/smartline-api << 'EOF'
server {
    listen 80;
    server_name _;

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

    client_max_body_size 10M;
}
EOF

ln -sf /etc/nginx/sites-available/smartline-api /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx
systemctl enable nginx
print_success "Nginx configured"

# Setup firewall
print_info "Configuring firewall..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
print_success "Firewall configured"

# Create PM2 ecosystem file
print_info "Creating PM2 configuration..."
cat > /var/www/smartline-api/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'smartline-api',
    script: './src/app.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G'
  }]
};
EOF
print_success "PM2 configuration created"

# Create systemd service
print_info "Setting up systemd service..."
sudo -u $SUDO_USER bash -c "cd /var/www/smartline-api && pm2 startup systemd -u $SUDO_USER --hp /home/$SUDO_USER"

print_info "Creating deployment instructions..."
cat > /var/www/smartline-api/DEPLOY_INSTRUCTIONS.md << 'EOF'
# SmartLine AI Backend Deployment Instructions

## Your server is ready! Now deploy your code:

### 1. Clone your repository:
```bash
cd /var/www/smartline-api
git clone https://github.com/YOUR_USERNAME/smartline-backend.git .
# OR
git clone https://github.com/appmakercloud/SmartLineAI.git .
```

### 2. Install dependencies:
```bash
npm install
```

### 3. Generate Prisma client:
```bash
npx prisma generate
```

### 4. Run database migrations:
```bash
npx prisma migrate deploy
```

### 5. Create logs directory:
```bash
mkdir -p logs
```

### 6. Start the application:
```bash
pm2 start ecosystem.config.js
pm2 save
```

### 7. Important Security Steps:

1. **Generate new JWT secrets:**
   ```bash
   # Generate secure secrets
   openssl rand -base64 32  # For JWT_SECRET
   openssl rand -base64 32  # For JWT_REFRESH_SECRET
   ```
   
2. **Update .env file with:**
   - New JWT secrets
   - Your VoIP credentials (Twilio/Plivo)
   - Your domain name for webhooks

3. **Change database passwords:**
   ```bash
   sudo -u postgres psql
   ALTER USER smartline PASSWORD 'your_new_secure_password';
   \q
   ```
   Update DATABASE_URL in .env

4. **Update Redis password:**
   Edit /etc/redis/redis.conf and update requirepass
   Update REDIS_URL in .env

### 8. SSL Certificate (if you have a domain):
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## Monitoring Commands:
- View logs: `pm2 logs smartline-api`
- Monitor: `pm2 monit`
- Status: `pm2 status`
- Restart: `pm2 restart smartline-api`

## Your server details:
- API URL: http://YOUR_SERVER_IP
- Database: smartline_db
- Redis: localhost:6379
EOF

print_success "Deployment instructions created at /var/www/smartline-api/DEPLOY_INSTRUCTIONS.md"

echo ""
echo "================================================"
echo -e "${GREEN}Server setup completed successfully!${NC}"
echo "================================================"
echo ""
echo "Next steps:"
echo "1. cd /var/www/smartline-api"
echo "2. Clone your repository"
echo "3. Follow the instructions in DEPLOY_INSTRUCTIONS.md"
echo ""
echo "Default credentials (CHANGE THESE!):"
echo "PostgreSQL: smartline / smartline_secure_password_2024"
echo "Redis: smartline_redis_password_2024"
echo ""
print_info "Remember to update all passwords and secrets!"