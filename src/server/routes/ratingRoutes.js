const express = require('express');
const router = express.Router();
const ratingController = require('../controllers/ratingController');
const authenticate = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/roleMiddleware');
const validate = require('../middlewares/validateMiddleware');
const { createRatingSchema } = require('../validations/ratingValidation');

router.use(authenticate, requireRole('cargo_owner'));
router.post('/:shipmentId', validate(createRatingSchema), ratingController.create);

module.exports = router;
