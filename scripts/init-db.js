#!/usr/bin/env node
const { execSync } = require('child_process');

console.log('🚀 Initializing database...');

try {
  // Generate Prisma Client
  console.log('📦 Generating Prisma Client...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  
  // Run migrations
  console.log('🔄 Running database migrations...');
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
  
  // Seed the database with initial data
  console.log('🌱 Seeding database with subscription plans...');
  execSync('node prisma/seed-plans.js', { stdio: 'inherit' });
  
  console.log('✅ Database initialization complete!');
} catch (error) {
  console.error('❌ Database initialization failed:', error.message);
  process.exit(1);
}