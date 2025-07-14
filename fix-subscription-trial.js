// Temporary fix for subscription trial endpoint
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestSubscription() {
    try {
        // First, ensure the free plan exists
        const freePlan = await prisma.subscriptionPlan.upsert({
            where: { id: 'free' },
            update: {},
            create: {
                id: 'free',
                name: 'free',
                displayName: 'Free Trial',
                price: 0,
                currency: 'USD',
                interval: 'month',
                includedMinutes: 50,
                includedSms: 50,
                includedNumbers: 1,
                pricePerExtraMinute: 0.025,
                pricePerExtraSms: 0.01,
                maxNumbers: 1,
                features: {
                    voicemail: true,
                    callRecording: false,
                    analytics: false,
                    apiAccess: false,
                    customGreeting: false,
                    callTransfer: false,
                    teamMembers: 1
                },
                sortOrder: 0,
                isActive: true
            }
        });
        
        console.log('✓ Free plan exists');
        
        // Create a test user subscription
        const testUserId = '0ff88f68-e3c4-4d64-8d61-94e39d7dd61a'; // Your user ID
        
        const subscription = await prisma.userSubscription.upsert({
            where: { userId: testUserId },
            update: {
                status: 'trialing',
                trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
            },
            create: {
                userId: testUserId,
                planId: 'free',
                status: 'trialing',
                currentPeriodStart: new Date(),
                currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            }
        });
        
        console.log('✓ User subscription created/updated');
        console.log('  Status:', subscription.status);
        console.log('  Trial ends:', subscription.trialEndsAt);
        
        // Create usage record
        const usage = await prisma.usageRecord.upsert({
            where: {
                userId_billingPeriod: {
                    userId: testUserId,
                    billingPeriod: new Date().toISOString().slice(0, 7) // YYYY-MM format
                }
            },
            update: {},
            create: {
                userId: testUserId,
                billingPeriod: new Date().toISOString().slice(0, 7),
                minutesUsed: 0,
                smsUsed: 0,
                numbersUsed: 0,
                recordedAt: new Date()
            }
        });
        
        console.log('✓ Usage record created');
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

createTestSubscription();