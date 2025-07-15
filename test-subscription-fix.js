const { PrismaClient } = require('@prisma/client');
const subscriptionService = require('./src/services/subscriptionService');

const prisma = new PrismaClient();

async function testSubscriptionFix() {
  try {
    console.log('Testing subscription fix...');
    
    // Test the special payment method handling
    const testUserId = '7afd3dec-7127-45e1-bdc0-1031832cf2a2'; // Your user ID from logs
    const testPlanId = 'starter';
    const specialPaymentId = 'pm_stripe_success';
    
    console.log(`Calling subscribeToPlan with special payment ID: ${specialPaymentId}`);
    
    const result = await subscriptionService.subscribeToPlan(
      testUserId,
      testPlanId,
      specialPaymentId
    );
    
    console.log('Success! Subscription created:', result);
  } catch (error) {
    console.error('Test failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testSubscriptionFix();