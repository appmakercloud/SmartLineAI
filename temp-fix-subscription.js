// Temporary fix to use Stripe Price IDs from environment variables
// This modifies the subscription service to use env vars if database values are null

const fs = require('fs');
const path = require('path');

const serviceFile = path.join(__dirname, 'src/services/subscriptionService.js');

// Read the current service file
let content = fs.readFileSync(serviceFile, 'utf8');

// Add a function to get price ID with fallback to env
const patchCode = `
  // Helper to get Stripe price ID with env fallback
  _getStripePriceId(plan) {
    if (plan.stripePriceId) return plan.stripePriceId;
    
    // Fallback to environment variables
    const envMap = {
      'free': process.env.STRIPE_FREE_PRICE_ID,
      'starter': process.env.STRIPE_STARTER_PRICE_ID,
      'professional': process.env.STRIPE_PROFESSIONAL_PRICE_ID,
      'business': process.env.STRIPE_BUSINESS_PRICE_ID,
      'enterprise': process.env.STRIPE_ENTERPRISE_PRICE_ID
    };
    
    return envMap[plan.id] || plan.stripePriceId;
  }
`;

// Check if patch already exists
if (!content.includes('_getStripePriceId')) {
  // Find where to insert (after class declaration)
  const classIndex = content.indexOf('class SubscriptionService {');
  const nextBraceIndex = content.indexOf('{', classIndex) + 1;
  
  // Insert the patch
  content = content.slice(0, nextBraceIndex) + '\n' + patchCode + content.slice(nextBraceIndex);
  
  // Replace stripePriceId references
  content = content.replace(/plan\.stripePriceId/g, 'this._getStripePriceId(plan)');
  
  // Write back
  fs.writeFileSync(serviceFile, content);
  console.log('Subscription service patched successfully!');
} else {
  console.log('Patch already applied.');
}

console.log('\nTo deploy this fix:');
console.log('1. Copy this file to the server');
console.log('2. Run: node temp-fix-subscription.js');
console.log('3. Restart PM2: pm2 restart smartline-api');