const express = require('express');
const router = express.Router();
const complaintController = require('../controllers/complaintController');
const authenticate = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');
const validate = require('../middleware/validateMiddleware');
const { createComplaintSchema } = require('../validations/complaintValidation');

router.use(authenticate, requireRole('cargo_owner'));
router.post('/', validate(createComplaintSchema), complaintController.create);
router.get('/', complaintController.getMine);

module.exports = router;
