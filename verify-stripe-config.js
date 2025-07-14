// Verify Stripe configuration is loaded
require('dotenv').config();

console.log('=== Stripe Configuration Verification ===\n');

// Check environment variables
console.log('1. Environment Variables:');
console.log('   STRIPE_SECRET_KEY:', process.env.STRIPE_SECRET_KEY ? '✓ Set (starts with ' + process.env.STRIPE_SECRET_KEY.substring(0, 20) + '...)' : '✗ Not set');
console.log('   STRIPE_WEBHOOK_SECRET:', process.env.STRIPE_WEBHOOK_SECRET ? '✓ Set (' + process.env.STRIPE_WEBHOOK_SECRET + ')' : '✗ Not set');

// Check if we can initialize Stripe
console.log('\n2. Stripe Initialization:');
try {
  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  console.log('   ✓ Stripe client initialized successfully');
  
  // Test Stripe connection
  console.log('\n3. Testing Stripe Connection:');
  stripe.products.list({ limit: 1 })
    .then(products => {
      console.log('   ✓ Successfully connected to Stripe');
      console.log('   ✓ Found', products.data.length, 'products');
      if (products.data.length > 0) {
        console.log('   First product:', products.data[0].name);
      }
    })
    .catch(err => {
      console.log('   ✗ Stripe connection failed:', err.message);
    });
    
  // List all products
  console.log('\n4. Listing All Stripe Products:');
  stripe.products.list({ limit: 10 })
    .then(products => {
      products.data.forEach(product => {
        console.log(`   - ${product.id}: ${product.name}`);
      });
    })
    .catch(err => {
      console.log('   ✗ Failed to list products:', err.message);
    });
    
} catch (err) {
  console.log('   ✗ Failed to initialize Stripe:', err.message);
}

// Check database for Stripe IDs
console.log('\n5. Database Stripe IDs:');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    const plans = await prisma.subscriptionPlan.findMany({
      select: {
        id: true,
        displayName: true,
        stripePriceId: true,
        stripeProductId: true
      }
    });
    
    plans.forEach(plan => {
      console.log(`   ${plan.id}:`);
      console.log(`     Product: ${plan.stripeProductId || 'Not set'}`);
      console.log(`     Price: ${plan.stripePriceId || 'Not set'}`);
    });
    
  } catch (err) {
    console.log('   ✗ Database check failed:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();

// Show which environment we're in
console.log('\n6. Environment:');
console.log('   NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('   Current directory:', process.cwd());