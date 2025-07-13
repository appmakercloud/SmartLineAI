#!/bin/bash

# SmartLine AI - One-Click Ubuntu Deployment Script
# This script handles EVERYTHING automatically

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

print_step() {
    echo -e "${BLUE}[$1/$2] $3${NC}"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   print_error "This script must be run as root"
   echo "Please run: sudo bash deploy-one-click.sh"
   exit 1
fi

echo "================================================"
echo "SmartLine AI - One-Click Deployment Script"
echo "================================================"
echo ""

# Get server IP
SERVER_IP=$(curl -s ifconfig.me)
print_info "Server IP: $SERVER_IP"
echo ""

# STEP 1: Update System
print_step 1 10 "Updating system packages..."
apt update && apt upgrade -y > /dev/null 2>&1
print_success "System updated"

# STEP 2: Install required packages
print_step 2 10 "Installing required packages..."
apt install -y curl git nginx postgresql postgresql-contrib redis-server ufw fail2ban > /dev/null 2>&1
print_success "Packages installed"

# STEP 3: Install Node.js 18
print_step 3 10 "Installing Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash - > /dev/null 2>&1
apt install -y nodejs > /dev/null 2>&1
print_success "Node.js $(node --version) installed"

# STEP 4: Install PM2
print_step 4 10 "Installing PM2..."
npm install -g pm2 > /dev/null 2>&1
print_success "PM2 installed"

# STEP 5: Setup PostgreSQL
print_step 5 10 "Setting up PostgreSQL database..."
sudo -u postgres psql > /dev/null 2>&1 << EOF
DROP DATABASE IF EXISTS smartline_db;
DROP USER IF EXISTS smartline;
CREATE USER smartline WITH PASSWORD 'smartline_secure_password_2024';
CREATE DATABASE smartline_db OWNER smartline;
GRANT ALL PRIVILEGES ON DATABASE smartline_db TO smartline;
EOF
print_success "PostgreSQL database created"

# STEP 6: Setup Redis
print_step 6 10 "Configuring Redis..."
sed -i 's/supervised no/supervised systemd/g' /etc/redis/redis.conf
sed -i 's/# requirepass foobared/requirepass smartline_redis_password_2024/g' /etc/redis/redis.conf
systemctl restart redis-server
systemctl enable redis-server > /dev/null 2>&1
print_success "Redis configured"

# STEP 7: Clone repository and setup application
print_step 7 10 "Setting up application..."

# Remove old directory if exists
rm -rf /var/www/smartline-api

# Clone repository
print_info "Cloning repository..."
cd /var/www
git clone https://github.com/appmakercloud/SmartLineAI.git smartline-api > /dev/null 2>&1

# Navigate to backend directory
cd /var/www/smartline-api/SmartLineAI

# Create .env file
print_info "Creating environment configuration..."
cat > .env << 'EOF'
# Server Configuration
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL="postgresql://smartline:smartline_secure_password_2024@localhost:5432/smartline_db"

# Redis
REDIS_URL="redis://:smartline_redis_password_2024@localhost:6379"

# JWT Secrets
JWT_SECRET="jwt-secret-$(openssl rand -hex 32)"
JWT_REFRESH_SECRET="jwt-refresh-$(openssl rand -hex 32)"

# VoIP Providers (Add your credentials later)
TWILIO_ACCOUNT_SID=""
TWILIO_AUTH_TOKEN=""
TWILIO_WEBHOOK_URL="http://${SERVER_IP}/webhooks/twilio"

PLIVO_AUTH_ID=""
PLIVO_AUTH_TOKEN=""
PLIVO_WEBHOOK_URL="http://${SERVER_IP}/webhooks/plivo"

# Payment (Optional)
STRIPE_SECRET_KEY=""
STRIPE_WEBHOOK_SECRET=""

# AI Services (Optional)
OPENAI_API_KEY=""
EOF

# Set permissions
chmod 600 .env

# Install dependencies
print_info "Installing dependencies..."
npm install > /dev/null 2>&1
print_success "Dependencies installed"

# Generate Prisma client
print_info "Generating Prisma client..."
npx prisma generate > /dev/null 2>&1
print_success "Prisma client generated"

# Run migrations
print_info "Running database migrations..."
npx prisma migrate deploy > /dev/null 2>&1
print_success "Database migrations completed"

# Create logs directory
mkdir -p logs
print_success "Application setup completed"

# STEP 8: Setup Nginx
print_step 8 10 "Configuring Nginx..."
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

    location /webhooks/ {
        proxy_pass http://localhost:3000/webhooks/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    client_max_body_size 10M;
}
EOF

ln -sf /etc/nginx/sites-available/smartline-api /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t > /dev/null 2>&1
systemctl restart nginx
systemctl enable nginx > /dev/null 2>&1
print_success "Nginx configured"

# STEP 9: Setup PM2 and start application
print_step 9 10 "Starting application with PM2..."

# Create PM2 ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'smartline-api',
    script: './src/app.js',
    instances: 2,
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

# Start application
pm2 start ecosystem.config.js > /dev/null 2>&1
pm2 save > /dev/null 2>&1
pm2 startup systemd -u root --hp /root > /dev/null 2>&1
systemctl restart pm2-root > /dev/null 2>&1
print_success "Application started"

# STEP 10: Setup firewall
print_step 10 10 "Configuring firewall..."
ufw allow OpenSSH > /dev/null 2>&1
ufw allow 'Nginx Full' > /dev/null 2>&1
ufw --force enable > /dev/null 2>&1
print_success "Firewall configured"

# Create quick management script
cat > /root/smartline-manage.sh << 'EOF'
#!/bin/bash

case "$1" in
    status)
        echo "=== Application Status ==="
        pm2 status
        echo ""
        echo "=== Nginx Status ==="
        systemctl status nginx --no-pager | head -n 5
        echo ""
        echo "=== Database Status ==="
        systemctl status postgresql --no-pager | head -n 5
        echo ""
        echo "=== Redis Status ==="
        systemctl status redis-server --no-pager | head -n 5
        ;;
    logs)
        pm2 logs smartline-api
        ;;
    restart)
        pm2 restart smartline-api
        ;;
    update)
        cd /var/www/smartline-api/SmartLineAI
        git pull
        npm install
        npx prisma generate
        npx prisma migrate deploy
        pm2 restart smartline-api
        ;;
    *)
        echo "Usage: $0 {status|logs|restart|update}"
        exit 1
        ;;
esac
EOF

chmod +x /root/smartline-manage.sh

# Create credentials file
cat > /root/smartline-credentials.txt << EOF
================================================
SmartLine AI - Deployment Credentials
================================================

Server URL: http://$SERVER_IP
API Endpoint: http://$SERVER_IP/api

Database:
- Host: localhost
- Database: smartline_db
- User: smartline
- Password: smartline_secure_password_2024

Redis:
- Host: localhost:6379
- Password: smartline_redis_password_2024

Application Management:
- Check status: /root/smartline-manage.sh status
- View logs: /root/smartline-manage.sh logs
- Restart app: /root/smartline-manage.sh restart
- Update app: /root/smartline-manage.sh update

PM2 Commands:
- pm2 status
- pm2 logs smartline-api
- pm2 monit

IMPORTANT: Please update these credentials!
1. Change database password
2. Change Redis password
3. Add your VoIP credentials in /var/www/smartline-api/SmartLineAI/.env

EOF

chmod 600 /root/smartline-credentials.txt

echo ""
echo "================================================"
echo -e "${GREEN}✓ DEPLOYMENT COMPLETED SUCCESSFULLY!${NC}"
echo "================================================"
echo ""
echo -e "${GREEN}Your SmartLine AI backend is now running!${NC}"
echo ""
echo -e "Server URL: ${BLUE}http://$SERVER_IP${NC}"
echo -e "API Status: ${BLUE}http://$SERVER_IP/api/health${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Update VoIP credentials in: /var/www/smartline-api/SmartLineAI/.env"
echo "2. Check credentials in: /root/smartline-credentials.txt"
echo "3. Monitor logs: pm2 logs smartline-api"
echo ""
echo -e "${YELLOW}Management Commands:${NC}"
echo "- Status: /root/smartline-manage.sh status"
echo "- Logs: /root/smartline-manage.sh logs"
echo "- Restart: /root/smartline-manage.sh restart"
echo "- Update: /root/smartline-manage.sh update"
echo ""
print_success "Deployment script completed!"