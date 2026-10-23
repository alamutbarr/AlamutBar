const express = require('express');
const router = express.Router();
const upload = require('../config/upload');
const uploadController = require('../controllers/uploadController');
const authenticate = require('../middlewares/authMiddleware');

router.use(authenticate);
router.post('/photos', upload.array('photos', 5), uploadController.uploadPhotos);
router.post('/evidence', upload.single('evidence'), uploadController.uploadEvidence);

module.exports = router;
