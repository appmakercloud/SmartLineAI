#!/usr/bin/env node
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { logger } = require('../src/middleware/logging');

const prisma = new PrismaClient();

async function cleanup() {
  try {
    logger.info('Starting daily cleanup...');
    
    // 1. Delete old call records (older than 90 days)
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setDate(threeMonthsAgo.getDate() - 90);
    
    const deletedCalls = await prisma.call.deleteMany({
      where: {
        createdAt: {
          lt: threeMonthsAgo
        }
      }
    });
    logger.info(`Deleted ${deletedCalls.count} old call records`);
    
    // 2. Delete old messages (older than 30 days for free users)
    const oneMonthAgo = new Date();
    oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
    
    const deletedMessages = await prisma.message.deleteMany({
      where: {
        createdAt: {
          lt: oneMonthAgo
        },
        user: {
          subscription: 'free'
        }
      }
    });
    logger.info(`Deleted ${deletedMessages.count} old messages`);
    
    // 3. Clean up expired temporary numbers
    const expiredNumbers = await prisma.virtualNumber.findMany({
      where: {
        expiresAt: {
          lt: new Date()
        },
        isActive: true
      }
    });
    
    logger.info(`Found ${expiredNumbers.length} expired numbers to clean up`);
    
    // 4. Clean up orphaned transactions
    const orphanedTransactions = await prisma.transaction.deleteMany({
      where: {
        status: 'pending',
        createdAt: {
          lt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours old
        }
      }
    });
    logger.info(`Deleted ${orphanedTransactions.count} orphaned transactions`);
    
    logger.info('Cleanup completed successfully');
  } catch (error) {
    logger.error('Cleanup error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

cleanup();