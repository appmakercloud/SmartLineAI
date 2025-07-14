# Emergency Stripe Fix Instructions

Since SSH is not accessible, here are alternative methods to fix the Stripe configuration:

## Method 1: Through Hosting Control Panel

If you have access to a web-based control panel (cPanel, Plesk, etc.):

1. **Access File Manager**
   - Navigate to `/var/www/smartline-api/`
   - Create a new file called `fix-stripe.js`

2. **Add this content to fix-stripe.js**:
```javascript
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixStripe() {
  console.log('Fixing Stripe configuration...');
  
  try {
    // Update database
    await prisma.subscriptionPlan.update({
      where: { id: 'free' },
      data: {
        stripeProductId: 'prod_Sg35Z4AfaVPtfE',
        stripePriceId: 'price_1RkgywPAlYPOyo6SuznmPqId'
      }
    });
    
    await prisma.subscriptionPlan.update({
      where: { id: 'starter' },
      data: {
        stripeProductId: 'prod_Sg366EQwqorvx9',
        stripePriceId: 'price_1RkgzqPAlYPOyo6SWeOw7QbX'
      }
    });
    
    console.log('✓ Stripe IDs updated in database');
    
    // Create a verification file
    const fs = require('fs');
    fs.writeFileSync('stripe-fixed.txt', 'Stripe configuration fixed at: ' + new Date());
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixStripe();
```

3. **Run through PM2** (if you have PM2 web interface):
   - Execute: `pm2 start fix-stripe.js --no-autorestart`
   - Then: `pm2 restart smartline-api`

## Method 2: Through API Modification

Since the API is still running, we can temporarily add an endpoint:

1. **Check current configuration**:
```bash
curl https://smartlineai.webagencies.com/api/subscriptions/plans
```

2. **If you can deploy code**, the stripe-fix.js route I created can be deployed and accessed via:
```bash
# Check configuration
curl https://smartlineai.webagencies.com/api/stripe-fix/check-stripe/temporary-fix-2024

# Fix configuration
curl -X POST https://smartlineai.webagencies.com/api/stripe-fix/fix-stripe/temporary-fix-2024
```

## Method 3: Direct Database Access

If you have database access through phpMyAdmin or similar:

```sql
-- Run these SQL commands
UPDATE subscription_plans 
SET stripe_product_id = 'prod_Sg35Z4AfaVPtfE',
    stripe_price_id = 'price_1RkgywPAlYPOyo6SuznmPqId'
WHERE id = 'free';

UPDATE subscription_plans 
SET stripe_product_id = 'prod_Sg366EQwqorvx9',
    stripe_price_id = 'price_1RkgzqPAlYPOyo6SWeOw7QbX'
WHERE id = 'starter';

UPDATE subscription_plans 
SET stripe_product_id = 'prod_Sg37ITAePdnELv',
    stripe_price_id = 'price_1Rkh17PAlYPOyo6SSjubU0dG'
WHERE id = 'professional';

UPDATE subscription_plans 
SET stripe_product_id = 'prod_Sg38E0mcZ3WcB5',
    stripe_price_id = 'price_1Rkh1pPAlYPOyo6S6CJ1kJrE'
WHERE id = 'business';

UPDATE subscription_plans 
SET stripe_product_id = 'prod_Sg38KFqwVoHrr4',
    stripe_price_id = 'price_1Rkh2ePAlYPOyo6SewVz8S0I'
WHERE id = 'enterprise';
```

## Method 4: Contact Hosting Provider

If none of the above work:
1. Contact your hosting provider about SSH access
2. Ask them to restart the SSH service
3. Check if the SSH port has changed (sometimes it's not 22)

## Temporary Workaround for iOS App

While fixing the backend, you can test the subscription flow by:

1. Using the mock payment method in the iOS app
2. The free trial should work even without Stripe if the user doesn't have a subscription

## Verification

Once fixed, verify with:
```bash
curl https://smartlineai.webagencies.com/api/subscriptions/plans | jq '.plans[0]'
```

You should see `stripe_price_id` populated with the actual IDs.