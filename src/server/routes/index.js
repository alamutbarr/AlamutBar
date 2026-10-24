const express = require('express');
const router = express.Router();

router.use('/auth', require('./authRoutes'));
router.use('/shipments', require('./shipmentRoutes'));
router.use('/vehicles', require('./vehicleRoutes'));
router.use('/locations', require('./locationRoutes'));
router.use('/notifications', require('./notificationRoutes'));
router.use('/complaints', require('./complaintRoutes'));
router.use('/ratings', require('./ratingRoutes'));
router.use('/uploads', require('./uploadRoutes'));
router.use('/operator', require('./operatorRoutes'));
router.use('/driver-auth', require('./driverAuth'));
router.use('/driver', require('./driverPanel'));
router.use('/location', require('./driverLocation'));
router.use('/chat', require('./chatRoutes'));
router.use('/admin', require('../admin/routes'));
router.use('/v1/driver', require('../mobile/driverApi'));

module.exports = router;
