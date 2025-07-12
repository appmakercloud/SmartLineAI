#!/usr/bin/env node
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const plivoService = require('../src/services/plivoService');
const { logger } = require('../src/middleware/logging');

const prisma = new PrismaClient();

async function expireNumbers() {
  try {
    logger.info('Checking for expired numbers...');
    
    // Find expired numbers
    const expiredNumbers = await prisma.virtualNumber.findMany({
      where: {
        expiresAt: {
          lt: new Date()
        },
        isActive: true
      },
      include: {
        user: true
      }
    });
    
    logger.info(`Found ${expiredNumbers.length} expired numbers`);
    
    for (const number of expiredNumbers) {
      try {
        // Release from Plivo
        await plivoService.releaseNumber(number.number, number.userId);
        
        // Mark as inactive
        await prisma.virtualNumber.update({
          where: { id: number.id },
          data: { isActive: false }
        });
        
        logger.info(`Released expired number: ${number.number}`);
        
        // TODO: Send notification to user
      } catch (error) {
        logger.error(`Failed to release number ${number.number}:`, error);
      }
    }
    
    // Check for numbers expiring in 3 days and send warnings
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    
    const expiringNumbers = await prisma.virtualNumber.findMany({
      where: {
        expiresAt: {
          gte: new Date(),
          lte: threeDaysFromNow
        },
        isActive: true
      },
      include: {
        user: true
      }
    });
    
    logger.info(`${expiringNumbers.length} numbers expiring in 3 days`);
    
    // TODO: Send warning notifications
    
    logger.info('Number expiration check completed');
  } catch (error) {
    logger.error('Expire numbers error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

expireNumbers();