const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const auth = require('../middleware/auth');

// Test endpoint to start trial without Stripe
router.post('/test-trial', auth, async (req, res) => {
    try {
        const userId = req.user.userId;
        
        // Check if user already has a subscription
        const existingSubscription = await prisma.userSubscription.findUnique({
            where: { userId }
        });
        
        if (existingSubscription) {
            return res.status(400).json({ 
                error: 'User already has a subscription',
                subscription: existingSubscription 
            });
        }
        
        // Create trial subscription
        const subscription = await prisma.userSubscription.create({
            data: {
                userId,
                planId: 'free',
                status: 'trialing',
                currentPeriodStart: new Date(),
                currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            }
        });
        
        // Create initial usage record
        await prisma.usageRecord.create({
            data: {
                userId,
                billingPeriod: new Date().toISOString().slice(0, 7),
                minutesUsed: 0,
                smsUsed: 0,
                numbersUsed: 0,
                recordedAt: new Date()
            }
        });
        
        res.json({
            success: true,
            subscription,
            message: 'Trial started successfully'
        });
        
    } catch (error) {
        console.error('Test trial error:', error);
        res.status(500).json({ 
            error: 'Failed to start trial',
            details: error.message 
        });
    }
});

module.exports = router;