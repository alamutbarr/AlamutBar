const express = require('express');
const router = express.Router();
const upload = require('../config/upload');
const uploadController = require('../controllers/uploadController');
const authenticate = require('../middleware/authMiddleware');

router.use(authenticate);
router.post('/photos', upload.array('photos', 4), uploadController.uploadPhotos);
router.post('/evidence', upload.array('evidence', 4), uploadController.uploadEvidence);

module.exports = router;
