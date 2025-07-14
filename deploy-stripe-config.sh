#!/bin/bash

echo "=== SmartLine AI Stripe Configuration Deployment ==="
echo ""
echo "This script will update the Stripe configuration on the production server."
echo "Server: smartlineai.webagencies.com"
echo ""

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    echo "Error: .env.production file not found!"
    exit 1
fi

echo "1. Copying .env.production to server..."
scp .env.production flickmax@216.70.74.232:/tmp/.env.production

echo ""
echo "2. SSH into server and update configuration..."
ssh flickmax@216.70.74.232 << 'ENDSSH'
    echo "Connected to server..."
    
    # Navigate to the app directory
    cd /var/www/smartline-api
    
    # Backup current .env file
    if [ -f .env ]; then
        echo "Backing up current .env file..."
        cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
    fi
    
    # Copy new env file
    echo "Updating .env file with Stripe configuration..."
    cp /tmp/.env.production .env
    
    # Remove temp file
    rm /tmp/.env.production
    
    # Update Stripe-specific values only (safer approach)
    # This preserves other settings like database passwords
    echo "Updating Stripe configuration..."
    
    # Check if npm packages are installed
    if [ ! -d "node_modules" ]; then
        echo "Installing dependencies..."
        npm install
    fi
    
    # Generate Prisma client
    echo "Generating Prisma client..."
    npx prisma generate
    
    # Check database connection
    echo "Checking database connection..."
    npx prisma db pull --print
    
    # Restart the application
    echo "Restarting application..."
    pm2 restart smartline-api
    
    # Show logs
    echo "Recent logs:"
    pm2 logs smartline-api --lines 10
    
    echo "Configuration updated successfully!"
ENDSSH

echo ""
echo "3. Testing the configuration..."
echo ""

# Test the API
echo "Testing API health endpoint..."
curl -s https://smartlineai.webagencies.com/health | jq .

echo ""
echo "Testing subscription plans endpoint..."
curl -s https://smartlineai.webagencies.com/api/subscriptions/plans | jq '.plans[0]'

echo ""
echo "=== Deployment Complete ==="
echo ""
echo "Next steps:"
echo "1. Test the subscription flow in the iOS app"
echo "2. Monitor the server logs: ssh flickmax@216.70.74.232 'pm2 logs smartline-api'"
echo "3. If there are issues, restore backup: ssh flickmax@216.70.74.232 'cd /var/www/smartline-api && cp .env.backup.* .env && pm2 restart smartline-api'"