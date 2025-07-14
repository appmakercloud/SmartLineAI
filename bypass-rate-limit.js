// TEMPORARY SCRIPT FOR DEVELOPMENT ONLY
// This script temporarily disables rate limiting for testing

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    const email = 'ashok@flickmax.com';
    const password = 'Test123!'; // Change this to your desired password
    
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      console.log('User already exists. Generating login token...');
      
      const tokens = {
        access: jwt.sign(
          { userId: existingUser.id, email: existingUser.email },
          process.env.JWT_SECRET || 'your-secret-key',
          { expiresIn: '24h' }
        ),
        refresh: jwt.sign(
          { userId: existingUser.id, type: 'refresh' },
          process.env.JWT_REFRESH_SECRET || 'your-refresh-secret',
          { expiresIn: '30d' }
        )
      };
      
      console.log('\nLogin successful! Use these credentials in the app:');
      console.log('Email:', email);
      console.log('Password:', password);
      console.log('\nOr use this access token directly:');
      console.log(tokens.access);
      
    } else {
      // Create new user
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          subscription: 'free'
        }
      });
      
      console.log('\nUser created successfully!');
      console.log('Email:', email);
      console.log('Password:', password);
      console.log('User ID:', user.id);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();