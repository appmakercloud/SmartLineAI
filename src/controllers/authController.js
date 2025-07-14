const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');
const { logger } = require('../middleware/logging');

const prisma = new PrismaClient();

class AuthController {
  // Register new user
  async register(req, res) {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;
      
      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      });
      
      if (existingUser) {
        return res.status(400).json({ 
          error: 'An account with this email already exists' 
        });
      }
      
      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);
      
      // Create user with free credits
      const user = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          passwordHash,
          credits: 20, // Free credits for testing
          subscription: 'free'
        },
        select: {
          id: true,
          email: true,
          credits: true,
          subscription: true,
          createdAt: true
        }
      });

      // Create default AI settings
      await prisma.aISettings.create({
        data: {
          userId: user.id,
          voicemailEnabled: true,
          transcriptionEnabled: true
        }
      });
      
      // Generate tokens
      const accessToken = this.generateAccessToken(user.id);
      const refreshToken = this.generateRefreshToken(user.id);
      
      logger.info(`New user registered: ${user.email}`);
      
      res.status(201).json({
        user,
        tokens: {
          access: accessToken,
          refresh: refreshToken
        }
      });
    } catch (error) {
      logger.error('Registration error:', error);
      res.status(500).json({ error: 'Registration failed' });
    }
  }

  // Login user
  async login(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;
      
      // Find user
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        select: {
          id: true,
          email: true,
          passwordHash: true,
          credits: true,
          subscription: true,
          createdAt: true
        }
      });
      
      if (!user) {
        return res.status(401).json({ 
          error: 'Invalid email or password' 
        });
      }
      
      // Verify password
      const validPassword = await bcrypt.compare(password, user.passwordHash);
      
      if (!validPassword) {
        return res.status(401).json({ 
          error: 'Invalid email or password' 
        });
      }
      
      // Generate tokens
      const accessToken = this.generateAccessToken(user.id);
      const refreshToken = this.generateRefreshToken(user.id);
      
      // Remove password hash from response
      delete user.passwordHash;
      
      logger.info(`User logged in: ${user.email}`);
      
      res.json({
        user,
        tokens: {
          access: accessToken,
          refresh: refreshToken
        }
      });
    } catch (error) {
      logger.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  }

  // Refresh token
  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return res.status(400).json({ error: 'Refresh token required' });
      }
      
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
      
      if (decoded.type !== 'refresh') {
        return res.status(401).json({ error: 'Invalid token type' });
      }
      
      // Get user
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          credits: true,
          subscription: true
        }
      });
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Generate new access token
      const accessToken = this.generateAccessToken(user.id);
      
      res.json({
        user,
        tokens: {
          access: accessToken,
          refresh: refreshToken
        }
      });
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ error: 'Invalid refresh token' });
      }
      logger.error('Token refresh error:', error);
      res.status(500).json({ error: 'Token refresh failed' });
    }
  }

  // Get current user
  async getMe(req, res) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        select: {
          id: true,
          email: true,
          credits: true,
          subscription: true,
          createdAt: true,
          numbers: {
            where: { isActive: true },
            select: {
              id: true,
              number: true,
              countryCode: true,
              type: true,
              expiresAt: true
            }
          },
          aiSettings: true
        }
      });
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json(user);
    } catch (error) {
      logger.error('Get user error:', error);
      res.status(500).json({ error: 'Failed to get user data' });
    }
  }

  // Update push token
  async updatePushToken(req, res) {
    try {
      const { token, type } = req.body;
      
      await prisma.user.update({
        where: { id: req.userId },
        data: { pushToken: token }
      });
      
      logger.info(`Push token updated for user ${req.userId}`);
      res.json({ success: true });
    } catch (error) {
      logger.error('Push token update error:', error);
      res.status(500).json({ error: 'Failed to update push token' });
    }
  }

  // Helper methods
  generateAccessToken(userId) {
    return jwt.sign(
      { userId, type: 'access' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  }

  generateRefreshToken(userId) {
    return jwt.sign(
      { userId, type: 'refresh' },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );
  }
}

// Create instance and bind methods to preserve 'this' context
const authController = new AuthController();

// Bind all methods
authController.register = authController.register.bind(authController);
authController.login = authController.login.bind(authController);
authController.refresh = authController.refresh.bind(authController);
authController.getMe = authController.getMe.bind(authController);
authController.updatePushToken = authController.updatePushToken.bind(authController);
authController.generateAccessToken = authController.generateAccessToken.bind(authController);
authController.generateRefreshToken = authController.generateRefreshToken.bind(authController);

module.exports = authController;