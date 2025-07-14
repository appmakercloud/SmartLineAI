#\!/bin/bash

# Kill the PM2 process using port 3000
echo 'Killing PM2 process on port 3000...'
sudo kill -9 909

# Wait a moment for port to be released
sleep 2

# Delete all PM2 processes to start fresh
echo 'Stopping and deleting all PM2 processes...'
pm2 delete all

# Generate Prisma client
echo 'Generating Prisma client...'
cd /var/www/smartline-api
npx prisma generate

# Start the application with PM2
echo 'Starting smartline-api with PM2...'
pm2 start npm --name smartline-api -- start

# Save PM2 configuration
pm2 save

# Check status
pm2 status

# Seed the subscription plans
echo 'Seeding subscription plans...'
npm run seed:plans

echo 'Deployment complete\!'
