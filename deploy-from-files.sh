#!/bin/bash

# SmartLine AI - Deploy from uploaded files
# This script uses files uploaded to the server instead of git

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
   echo "Please run: sudo bash deploy-from-files.sh"
   exit 1
fi

echo "================================================"
echo "SmartLine AI - Deployment from Files"
echo "================================================"
echo ""

# Get server IP
SERVER_IP=$(curl -s ifconfig.me)
print_info "Server IP: $SERVER_IP"
echo ""

# STEP 1: Setup application directory
print_step 1 5 "Setting up application..."

# Create directory
mkdir -p /var/www/smartline-api
cd /var/www/smartline-api

# Extract uploaded files
if [ -f /home/flickmax/smartline-backend.tar.gz ]; then
    tar -xzf /home/flickmax/smartline-backend.tar.gz
    print_success "Files extracted"
else
    print_error "Backend files not found at /home/flickmax/smartline-backend.tar.gz"
    exit 1
fi

# STEP 2: Create .env file
print_step 2 5 "Creating environment configuration..."
cat > .env << EOF
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

chmod 600 .env
print_success "Environment configured"

# STEP 3: Install dependencies
print_step 3 5 "Installing dependencies..."
npm install
print_success "Dependencies installed"

# Generate Prisma client
print_info "Generating Prisma client..."
npx prisma generate
print_success "Prisma client generated"

# Run migrations
print_info "Running database migrations..."
npx prisma migrate deploy
print_success "Database migrations completed"

# Create logs directory
mkdir -p logs
print_success "Application setup completed"

# STEP 4: Setup PM2 and start application
print_step 4 5 "Starting application with PM2..."

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
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root | bash
print_success "Application started"

# STEP 5: Create management script
print_step 5 5 "Creating management tools..."

cat > /root/smartline-manage.sh << 'EOF'
#!/bin/bash

case "$1" in
    status)
        echo "=== Application Status ==="
        pm2 status
        echo ""
        echo "=== Service Health ==="
        curl -s http://localhost:3000/api/health || echo "API not responding"
        ;;
    logs)
        pm2 logs smartline-api
        ;;
    restart)
        cd /var/www/smartline-api
        pm2 restart smartline-api
        ;;
    env)
        nano /var/www/smartline-api/.env
        ;;
    *)
        echo "Usage: $0 {status|logs|restart|env}"
        exit 1
        ;;
esac
EOF

chmod +x /root/smartline-manage.sh

# Create credentials file
cat > /root/smartline-credentials.txt << EOF
================================================
SmartLine AI - Deployment Successful!
================================================

Server URL: http://$SERVER_IP
API Health: http://$SERVER_IP/api/health

Database:
- Host: localhost
- Database: smartline_db
- User: smartline
- Password: smartline_secure_password_2024

Redis:
- Host: localhost:6379
- Password: smartline_redis_password_2024

Application Directory: /var/www/smartline-api
Environment File: /var/www/smartline-api/.env

Management Commands:
- Check status: /root/smartline-manage.sh status
- View logs: /root/smartline-manage.sh logs
- Restart app: /root/smartline-manage.sh restart
- Edit config: /root/smartline-manage.sh env

IMPORTANT NEXT STEPS:
1. Edit environment: nano /var/www/smartline-api/.env
2. Add your Twilio/Plivo credentials
3. Update JWT secrets
4. Test API: curl http://localhost:3000/api/health

EOF

chmod 600 /root/smartline-credentials.txt

echo ""
echo "================================================"
echo -e "${GREEN}✓ DEPLOYMENT COMPLETED!${NC}"
echo "================================================"
echo ""
echo -e "API URL: ${BLUE}http://$SERVER_IP${NC}"
echo -e "Health Check: ${BLUE}http://$SERVER_IP/api/health${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Add VoIP credentials: /root/smartline-manage.sh env"
echo "2. Check status: /root/smartline-manage.sh status"
echo "3. View logs: /root/smartline-manage.sh logs"
echo ""
print_success "Server is ready!"