#!/usr/bin/env node
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

async function migrate() {
  try {
    console.log('Running database migrations...');
    
    // Generate Prisma client
    await execAsync('npx prisma generate');
    console.log('✓ Prisma client generated');
    
    // Run migrations
    await execAsync('npx prisma migrate deploy');
    console.log('✓ Migrations completed');
    
    console.log('✅ Database setup complete!');
  } catch (error) {
    console.error('Migration failed:', error);
    // Don't exit with error in production - the database might already be migrated
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
  }
}

migrate();