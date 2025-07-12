const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');
  
  // Create admin user
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@smartlineai.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'SmartLine2024!';
  
  const hashedPassword = await bcrypt.hash(adminPassword, 12);
  
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash: hashedPassword,
      subscription: 'business',
      credits: 99999,
      aiSettings: {
        create: {
          voicemailEnabled: true,
          transcriptionEnabled: true,
          smartReplyEnabled: true,
          voiceGreeting: 'Thank you for calling SmartLine AI support.'
        }
      }
    }
  });
  
  console.log('✅ Created admin user:', admin.email);
  
  // Create test user
  const testUser = await prisma.user.upsert({
    where: { email: 'test@smartlineai.com' },
    update: {},
    create: {
      email: 'test@smartlineai.com',
      passwordHash: await bcrypt.hash('test123', 12),
      subscription: 'free',
      credits: 20,
      aiSettings: {
        create: {
          voicemailEnabled: true,
          transcriptionEnabled: true
        }
      }
    }
  });
  
  console.log('✅ Created test user:', testUser.email);
  
  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });