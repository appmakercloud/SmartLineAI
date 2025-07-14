#!/bin/bash

# This script safely updates only the Stripe configuration on the server

cat > /tmp/stripe-env-update.sh << 'EOF'
#!/bin/bash

# Navigate to app directory
cd /var/www/smartline-api

# Backup current .env
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)

# Update Stripe configuration using sed
echo "Updating Stripe configuration..."

# Update or add Stripe keys
grep -q "^STRIPE_SECRET_KEY=" .env && \
    sed -i 's|^STRIPE_SECRET_KEY=.*|STRIPE_SECRET_KEY=sk_test_51RjzEOPAlYPOyo6SyNALlxtSAraZI7Dm1mRNSECuEYrj0MtEOFd2wR2ZZzfzAgvc2kahKT88nw29M6RXWhV39kKi00bbTgU1x0|' .env || \
    echo "STRIPE_SECRET_KEY=sk_test_51RjzEOPAlYPOyo6SyNALlxtSAraZI7Dm1mRNSECuEYrj0MtEOFd2wR2ZZzfzAgvc2kahKT88nw29M6RXWhV39kKi00bbTgU1x0" >> .env

grep -q "^STRIPE_WEBHOOK_SECRET=" .env && \
    sed -i 's|^STRIPE_WEBHOOK_SECRET=.*|STRIPE_WEBHOOK_SECRET=whsec_SYWSdlaWWUxFXU54qeJmajC7rxdE8PJw|' .env || \
    echo "STRIPE_WEBHOOK_SECRET=whsec_SYWSdlaWWUxFXU54qeJmajC7rxdE8PJw" >> .env

# Add Price IDs
grep -q "^STRIPE_FREE_PRICE_ID=" .env && \
    sed -i 's|^STRIPE_FREE_PRICE_ID=.*|STRIPE_FREE_PRICE_ID=price_1RkgywPAlYPOyo6SuznmPqId|' .env || \
    echo "STRIPE_FREE_PRICE_ID=price_1RkgywPAlYPOyo6SuznmPqId" >> .env

grep -q "^STRIPE_STARTER_PRICE_ID=" .env && \
    sed -i 's|^STRIPE_STARTER_PRICE_ID=.*|STRIPE_STARTER_PRICE_ID=price_1RkgzqPAlYPOyo6SWeOw7QbX|' .env || \
    echo "STRIPE_STARTER_PRICE_ID=price_1RkgzqPAlYPOyo6SWeOw7QbX" >> .env

grep -q "^STRIPE_PROFESSIONAL_PRICE_ID=" .env && \
    sed -i 's|^STRIPE_PROFESSIONAL_PRICE_ID=.*|STRIPE_PROFESSIONAL_PRICE_ID=price_1Rkh17PAlYPOyo6SSjubU0dG|' .env || \
    echo "STRIPE_PROFESSIONAL_PRICE_ID=price_1Rkh17PAlYPOyo6SSjubU0dG" >> .env

grep -q "^STRIPE_BUSINESS_PRICE_ID=" .env && \
    sed -i 's|^STRIPE_BUSINESS_PRICE_ID=.*|STRIPE_BUSINESS_PRICE_ID=price_1Rkh1pPAlYPOyo6S6CJ1kJrE|' .env || \
    echo "STRIPE_BUSINESS_PRICE_ID=price_1Rkh1pPAlYPOyo6S6CJ1kJrE" >> .env

grep -q "^STRIPE_ENTERPRISE_PRICE_ID=" .env && \
    sed -i 's|^STRIPE_ENTERPRISE_PRICE_ID=.*|STRIPE_ENTERPRISE_PRICE_ID=price_1Rkh2ePAlYPOyo6SewVz8S0I|' .env || \
    echo "STRIPE_ENTERPRISE_PRICE_ID=price_1Rkh2ePAlYPOyo6SewVz8S0I" >> .env

echo "Stripe configuration updated!"

# Update database with Stripe IDs
echo "Updating database with Stripe Product/Price IDs..."
psql -U smartline -d smartline_db -h localhost << 'EOSQL'
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
EOSQL

# Restart the application
echo "Restarting application..."
pm2 restart smartline-api

echo "Done! Checking status..."
pm2 status smartline-api
EOF

# Copy and execute on server
echo "Deploying Stripe configuration to server..."
scp /tmp/stripe-env-update.sh flickmax@216.70.74.232:/tmp/
ssh flickmax@216.70.74.232 'bash /tmp/stripe-env-update.sh'

# Cleanup
rm /tmp/stripe-env-update.sh

echo ""
echo "Testing the updated configuration..."
curl -s https://smartlineai.webagencies.com/api/subscriptions/plans | jq '.plans[0] | {id, displayName, stripe_price_id}'