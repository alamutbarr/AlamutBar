const express = require('express');
const router = express.Router();
const locationController = require('../controllers/locationController');
const authenticate = require('../middlewares/authMiddleware');

router.use(authenticate);
router.get('/cities', locationController.getCities);
router.get('/cities/:cityId/zones', locationController.getZonesByCity);

module.exports = router;
