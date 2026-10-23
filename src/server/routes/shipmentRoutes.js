const express = require('express');
const router = express.Router();
const shipmentController = require('../controllers/shipmentController');
const authenticate = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/roleMiddleware');
const validate = require('../middlewares/validateMiddleware');
const {
  createShipmentSchema,
  respondPriceSchema,
  cancelShipmentSchema,
} = require('../validations/shipmentValidation');

router.use(authenticate, requireRole('cargo_owner'));

router.post('/', validate(createShipmentSchema), shipmentController.create);
router.get('/', shipmentController.getMine);
router.get('/:id', shipmentController.getOne);
router.patch('/:id/respond-price', validate(respondPriceSchema), shipmentController.respondToPrice);
router.patch('/:id/cancel', validate(cancelShipmentSchema), shipmentController.cancel);
router.patch('/:id/confirm-delivery', shipmentController.confirmDelivery);

module.exports = router;
