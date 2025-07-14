#!/bin/bash

# Create SQL update script
cat > /tmp/update-stripe-db.sql << 'EOF'
-- First check if subscription_plans table exists
\dt subscription_plans

-- Update subscription plans with Stripe IDs
UPDATE subscription_plans SET 
    stripe_product_id = 'prod_Sg35Z4AfaVPtfE',
    stripe_price_id = 'price_1RkgywPAlYPOyo6SuznmPqId'
WHERE id = 'free';

UPDATE subscription_plans SET 
    stripe_product_id = 'prod_Sg366EQwqorvx9',
    stripe_price_id = 'price_1RkgzqPAlYPOyo6SWeOw7QbX'
WHERE id = 'starter';

UPDATE subscription_plans SET 
    stripe_product_id = 'prod_Sg37ITAePdnELv',
    stripe_price_id = 'price_1Rkh17PAlYPOyo6SSjubU0dG'
WHERE id = 'professional';

UPDATE subscription_plans SET 
    stripe_product_id = 'prod_Sg38E0mcZ3WcB5',
    stripe_price_id = 'price_1Rkh1pPAlYPOyo6S6CJ1kJrE'
WHERE id = 'business';

UPDATE subscription_plans SET 
    stripe_product_id = 'prod_Sg38KFqwVoHrr4',
    stripe_price_id = 'price_1Rkh2ePAlYPOyo6SewVz8S0I'
WHERE id = 'enterprise';

-- Show updated data
SELECT id, display_name, stripe_product_id, stripe_price_id FROM subscription_plans ORDER BY sort_order;
EOF

# Execute on server
echo "Updating Stripe IDs in database..."
scp /tmp/update-stripe-db.sql flickmax@216.70.74.232:/tmp/

ssh flickmax@216.70.74.232 << 'ENDSSH'
echo "Connected to server..."
cd /var/www/smartline-api

# Check if we have the DATABASE_URL in .env
if grep -q "DATABASE_URL" .env; then
    echo "Using DATABASE_URL from .env..."
    export $(grep DATABASE_URL .env | xargs)
    psql $DATABASE_URL < /tmp/update-stripe-db.sql
else
    echo "Using direct psql connection..."
    # Try with sudo to avoid password prompt
    sudo -u postgres psql -d smartline_db < /tmp/update-stripe-db.sql
fi

# Clean up
rm /tmp/update-stripe-db.sql

# Restart API to pick up changes
pm2 restart smartline-api

echo "Waiting for API to restart..."
sleep 3

# Check if it worked
echo "Checking updated configuration..."
curl -s https://smartlineai.webagencies.com/api/subscriptions/plans | jq '.plans[] | {id, displayName, stripe_price_id}' | head -20
ENDSSH

rm /tmp/update-stripe-db.sql