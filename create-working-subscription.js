const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestSubscription() {
  try {
    const userId = '0ff88f68-e3c4-4d64-8d61-94e39d7dd61a';

    console.log('Checking subscription for user...');

    // Check existing subscription
    const existing = await prisma.userSubscription.findFirst({
      where: { userId }
    });

    if (existing) {
      console.log('User already has a subscription:');
      console.log('  Status:', existing.status);
      console.log('  Plan ID:', existing.planId);
      console.log('  Period End:', existing.currentPeriodEnd);
      
      // Update if needed
      if (existing.status !== 'active' && existing.status !== 'trialing') {
        const updated = await prisma.userSubscription.update({
          where: { id: existing.id },
          data: { 
            status: 'active',
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          }
        });
        console.log('✓ Updated subscription to active status');
      }
      
      return existing;
    }

    // Create subscription without trialEndsAt field
    const subscription = await prisma.userSubscription.create({
      data: {
        userId,
        planId: 'free',
        status: 'active', // Start as active instead of trialing
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        stripeSubscriptionId: 'sub_test_' + Date.now(),
        stripePriceId: 'price_1RkgywPAlYPOyo6SuznmPqId' // Free plan price ID
      }
    });

    console.log('✓ Subscription created!');
    console.log('  ID:', subscription.id);
    console.log('  Status:', subscription.status);
    console.log('  Period End:', subscription.currentPeriodEnd);

    // Create usage record
    const billingPeriod = new Date().toISOString().slice(0, 7);
    await prisma.usageRecord.upsert({
      where: {
        userId_billingPeriod: { userId, billingPeriod }
      },
      update: {},
      create: {
        userId,
        billingPeriod,
        minutesUsed: 0,
        smsUsed: 0,
        numbersUsed: 0,
        recordedAt: new Date()
      }
    });
    
    console.log('✓ Usage record initialized');

    // Also update user record
    await prisma.user.update({
      where: { id: userId },
      data: { subscription: 'free' }
    });
    
    console.log('✓ User subscription field updated');

  } catch (error) {
    console.error('Error:', error.message);
    if (error.code === 'P2002') {
      console.log('User already has a subscription');
    }
  } finally {
    await prisma.$disconnect();
  }
}

createTestSubscription();