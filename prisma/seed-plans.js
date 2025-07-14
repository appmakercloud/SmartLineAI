const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedPlans() {
  console.log('Seeding subscription plans...');

  const plans = [
    {
      id: 'free',
      name: 'free',
      displayName: 'Free Trial',
      price: 0,
      includedMinutes: 50,
      includedSms: 50,
      includedNumbers: 1,
      hasAiFeatures: false,
      hasVoicemailTranscription: false,
      hasCallRecording: false,
      hasAutoAttendant: false,
      hasAnalytics: false,
      hasApiAccess: false,
      hasCrmIntegration: false,
      hasTeamFeatures: false,
      hasPrioritySupport: false,
      sortOrder: 0
    },
    {
      id: 'starter',
      name: 'starter',
      displayName: 'Starter',
      price: 19,
      includedMinutes: 300,
      includedSms: 500,
      includedNumbers: 1,
      hasAiFeatures: false,
      hasVoicemailTranscription: false,
      hasCallRecording: false,
      hasAutoAttendant: false,
      hasAnalytics: false,
      hasApiAccess: false,
      hasCrmIntegration: false,
      hasTeamFeatures: false,
      hasPrioritySupport: false,
      sortOrder: 1
    },
    {
      id: 'professional',
      name: 'professional',
      displayName: 'Professional',
      price: 39,
      includedMinutes: 1000,
      includedSms: 1000,
      includedNumbers: 1,
      hasAiFeatures: true,
      hasVoicemailTranscription: true,
      hasCallRecording: true,
      hasAutoAttendant: true,
      hasAnalytics: true,
      hasApiAccess: true,
      hasCrmIntegration: false,
      hasTeamFeatures: false,
      hasPrioritySupport: false,
      sortOrder: 2
    },
    {
      id: 'business',
      name: 'business',
      displayName: 'Business',
      price: 79,
      includedMinutes: 2500,
      includedSms: 2000,
      includedNumbers: 3,
      hasAiFeatures: true,
      hasVoicemailTranscription: true,
      hasCallRecording: true,
      hasAutoAttendant: true,
      hasAnalytics: true,
      hasApiAccess: true,
      hasCrmIntegration: true,
      hasTeamFeatures: true,
      hasPrioritySupport: false,
      sortOrder: 3
    },
    {
      id: 'enterprise',
      name: 'enterprise',
      displayName: 'Enterprise',
      price: 149,
      includedMinutes: 999999, // Effectively unlimited
      includedSms: 999999,     // Effectively unlimited
      includedNumbers: 10,
      hasAiFeatures: true,
      hasVoicemailTranscription: true,
      hasCallRecording: true,
      hasAutoAttendant: true,
      hasAnalytics: true,
      hasApiAccess: true,
      hasCrmIntegration: true,
      hasTeamFeatures: true,
      hasPrioritySupport: true,
      sortOrder: 4
    }
  ];

  for (const plan of plans) {
    await prisma.subscriptionPlan.upsert({
      where: { id: plan.id },
      update: plan,
      create: plan
    });
    console.log(`✓ Seeded ${plan.displayName} plan`);
  }

  console.log('✓ All plans seeded successfully');
}

seedPlans()
  .catch(e => {
    console.error('Error seeding plans:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });