const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestSubscription() {
  try {
    const userId = '0ff88f68-e3c4-4d64-8d61-94e39d7dd61a'; // Your user ID
    
    console.log('Creating test subscription for user...');
    
    // First, check if user already has a subscription
    const existing = await prisma.userSubscription.findFirst({
      where: { userId }
    });
    
    if (existing) {
      console.log('User already has a subscription:', existing.status);
      console.log('Subscription details:', {
        planId: existing.planId,
        status: existing.status,
        trialEndsAt: existing.trialEndsAt
      });
      return;
    }
    
    // Create a new trial subscription
    const subscription = await prisma.userSubscription.create({
      data: {
        userId,
        planId: 'free',
        status: 'trialing',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days trial
        stripeSubscriptionId: 'sub_trial_' + Date.now() // Mock ID for testing
      }
    });
    
    console.log('✓ Trial subscription created successfully!');
    console.log('Subscription ID:', subscription.id);
    console.log('Status:', subscription.status);
    console.log('Trial ends at:', subscription.trialEndsAt);
    
    // Create initial usage record
    const billingPeriod = new Date().toISOString().slice(0, 7); // YYYY-MM format
    
    await prisma.usageRecord.upsert({
      where: {
        userId_billingPeriod: {
          userId,
          billingPeriod
        }
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
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Also update the user to ensure they're on the free plan
async function updateUserPlan() {
  try {
    const userId = '0ff88f68-e3c4-4d64-8d61-94e39d7dd61a';
    
    await prisma.user.update({
      where: { id: userId },
      data: { subscription: 'free' }
    });
    
    console.log('✓ User subscription plan updated to free');
    
  } catch (error) {
    console.error('Error updating user:', error);
  }
}

async function main() {
  await updateUserPlan();
  await createTestSubscription();
}

main();