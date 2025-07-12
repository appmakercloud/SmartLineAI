#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');

async function runMigrations() {
  return new Promise((resolve) => {
    console.log('Checking database migrations...');
    const migrate = spawn('node', ['scripts/migrate.js'], {
      cwd: path.resolve(__dirname, '..'),
      stdio: 'inherit'
    });
    
    migrate.on('close', (code) => {
      if (code !== 0) {
        console.warn('Migration script exited with code', code);
        console.log('Continuing anyway - database might already be migrated');
      }
      resolve();
    });
    
    migrate.on('error', (err) => {
      console.error('Failed to run migrations:', err);
      console.log('Continuing anyway - database might already be migrated');
      resolve();
    });
  });
}

async function startApp() {
  console.log('Starting SmartLine AI server...');
  
  const app = spawn('node', ['src/app.js'], {
    cwd: path.resolve(__dirname, '..'),
    stdio: 'inherit',
    env: process.env
  });
  
  app.on('error', (err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}

async function main() {
  await runMigrations();
  await startApp();
}

main().catch(err => {
  console.error('Startup failed:', err);
  process.exit(1);
});