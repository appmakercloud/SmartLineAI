const express = require('express');
const { body, query } = require('express-validator');
const messagesController = require('../controllers/messagesController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Send SMS
router.post('/send', [
  body('from').isMobilePhone().withMessage('Invalid from number'),
  body('to').isMobilePhone().withMessage('Invalid to number'),
  body('text').notEmpty().isLength({ max: 1600 }).withMessage('Message text required')
], messagesController.sendMessage);

// Get message history
router.get('/history', [
  query('numberId').optional().isUUID(),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('offset').optional().isInt({ min: 0 })
], messagesController.getMessageHistory);

// Get conversation thread
router.get('/conversation/:phoneNumber', [
  query('numberId').isUUID().withMessage('Number ID required')
], messagesController.getConversation);

// Mark messages as read
router.post('/mark-read', [
  body('messageIds').isArray().withMessage('Message IDs array required')
], messagesController.markAsRead);

module.exports = router;