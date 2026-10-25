const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const authenticate = require('../middleware/authMiddleware');

router.use(authenticate);
router.get('/', notificationController.getMine);
router.patch('/:id/read', notificationController.markAsRead);

module.exports = router;
