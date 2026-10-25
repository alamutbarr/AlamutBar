const express = require('express');
const router = express.Router();
const ratingController = require('../controllers/ratingController');
const authenticate = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');
const validate = require('../middleware/validateMiddleware');
const { createRatingSchema } = require('../validations/ratingValidation');

router.use(authenticate, requireRole('cargo_owner'));
router.post('/:shipmentId', validate(createRatingSchema), ratingController.create);

module.exports = router;
