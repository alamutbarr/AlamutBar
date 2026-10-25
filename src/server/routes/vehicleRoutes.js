const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/vehicleController');
const authenticate = require('../middleware/authMiddleware');

router.use(authenticate);
router.get('/', vehicleController.getAll);

module.exports = router;
