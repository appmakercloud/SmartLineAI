#!/bin/bash

# Quick deployment script - Run this from your Mac

SERVER_IP="216.70.74.232"
SERVER_USER="flickmax"

echo "================================================"
echo "SmartLine AI - Quick Deployment"
echo "================================================"

# Create tar archive of backend (excluding node_modules)
echo "Creating archive of backend files..."
cd "/Users/ashokparmar/Develpers/SmartLine AI/backend"
tar -czf smartline-backend.tar.gz \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='logs' \
  --exclude='.env' \
  package.json \
  prisma \
  src \
  scripts

# Copy files to server
echo "Copying files to server..."
scp smartline-backend.tar.gz $SERVER_USER@$SERVER_IP:~/
scp deploy-one-click.sh $SERVER_USER@$SERVER_IP:~/

# Clean up local archive
rm smartline-backend.tar.gz

echo ""
echo "Files copied! Now SSH to your server and run:"
echo ""
echo "ssh $SERVER_USER@$SERVER_IP"
echo "sudo su"
echo "bash /home/$SERVER_USER/deploy-one-click.sh"