const express = require('express');
const { body, query } = require('express-validator');
const numbersController = require('../controllers/numbersController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Search available numbers
router.get('/search', [
  query('country').optional().isIn(['US', 'CA', 'GB']).withMessage('Invalid country code'),
  query('type').optional().isIn(['local', 'tollfree', 'mobile']).withMessage('Invalid number type'),
  query('pattern').optional().isString().withMessage('Invalid pattern'),
  query('areaCode').optional().isString().isLength({ min: 3, max: 3 }).withMessage('Area code must be 3 digits')
], numbersController.searchNumbers);

// Get user's numbers
router.get('/my', numbersController.getMyNumbers);

// Buy a number
router.post('/buy', [
  body('number').isMobilePhone().withMessage('Invalid phone number')
], numbersController.buyNumber);

// Release a number
router.delete('/:numberId', numbersController.releaseNumber);

// Update number settings
router.patch('/:numberId', [
  body('autoReply').optional().isBoolean(),
  body('voicemailGreeting').optional().isString().isLength({ max: 500 })
], numbersController.updateNumberSettings);

module.exports = router;