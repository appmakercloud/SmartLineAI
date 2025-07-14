#!/usr/bin/env node

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

console.log('=== SmartLine AI Stripe Configuration Check ===\n');

// Check environment variables
console.log('1. Checking Stripe Environment Variables:');
console.log('   STRIPE_SECRET_KEY:', process.env.STRIPE_SECRET_KEY ? '✓ Set' : '✗ Missing');
console.log('   STRIPE_WEBHOOK_SECRET:', process.env.STRIPE_WEBHOOK_SECRET ? '✓ Set' : '✗ Missing');
console.log('   STRIPE_PUBLISHABLE_KEY:', process.env.STRIPE_PUBLISHABLE_KEY ? '✓ Set' : '✗ Missing');

// Check Stripe Product IDs
console.log('\n2. Checking Stripe Product IDs:');
console.log('   STRIPE_FREE_PRICE_ID:', process.env.STRIPE_FREE_PRICE_ID || 'Not set');
console.log('   STRIPE_STARTER_PRICE_ID:', process.env.STRIPE_STARTER_PRICE_ID || 'Not set');
console.log('   STRIPE_PROFESSIONAL_PRICE_ID:', process.env.STRIPE_PROFESSIONAL_PRICE_ID || 'Not set');
console.log('   STRIPE_BUSINESS_PRICE_ID:', process.env.STRIPE_BUSINESS_PRICE_ID || 'Not set');
console.log('   STRIPE_ENTERPRISE_PRICE_ID:', process.env.STRIPE_ENTERPRISE_PRICE_ID || 'Not set');

// Test Stripe connection
console.log('\n3. Testing Stripe Connection:');
if (process.env.STRIPE_SECRET_KEY) {
    try {
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        stripe.products.list({ limit: 1 })
            .then(() => console.log('   ✓ Successfully connected to Stripe'))
            .catch(err => console.log('   ✗ Stripe connection failed:', err.message));
    } catch (err) {
        console.log('   ✗ Failed to initialize Stripe:', err.message);
    }
} else {
    console.log('   ✗ Cannot test - STRIPE_SECRET_KEY not set');
}

// Check database
console.log('\n4. Checking Database:');
const prisma = new PrismaClient();

async function checkDatabase() {
    try {
        // Check if subscription tables exist
        const tables = await prisma.$queryRaw`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name LIKE '%subscription%'
        `;
        
        if (tables.length > 0) {
            console.log('   ✓ Subscription tables found:');
            tables.forEach(t => console.log('     -', t.table_name));
        } else {
            console.log('   ✗ No subscription tables found');
        }
        
        // Check if subscription plans exist
        const plans = await prisma.$queryRaw`
            SELECT COUNT(*) as count FROM subscription_plans
        `.catch(() => null);
        
        if (plans) {
            console.log(`   ✓ Subscription plans in database: ${plans[0]?.count || 0}`);
        }
        
    } catch (err) {
        console.log('   ✗ Database check failed:', err.message);
    } finally {
        await prisma.$disconnect();
    }
}

checkDatabase();

// Check subscription service file
console.log('\n5. Checking Subscription Service:');
try {
    const subscriptionService = require('./src/services/subscriptionService');
    console.log('   ✓ Subscription service found');
    
    // Check if required methods exist
    const requiredMethods = ['startFreeTrial', 'subscribeToPlan', 'cancelSubscription'];
    requiredMethods.forEach(method => {
        if (typeof subscriptionService[method] === 'function') {
            console.log(`   ✓ ${method} method exists`);
        } else {
            console.log(`   ✗ ${method} method missing`);
        }
    });
} catch (err) {
    console.log('   ✗ Subscription service not found or has errors:', err.message);
}

console.log('\n=== End of Check ===');
console.log('\nTo fix missing configurations:');
console.log('1. Add missing environment variables to .env file');
console.log('2. Run database migrations: npm run migrate');
console.log('3. Seed subscription plans: npm run seed:plans');
console.log('4. Configure Stripe products in your Stripe dashboard');