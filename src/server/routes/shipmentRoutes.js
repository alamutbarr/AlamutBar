const express = require('express');
const router = express.Router();
const shipmentController = require('../controllers/shipmentController');
const authenticate = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');
const validate = require('../middleware/validateMiddleware');
const {
  createShipmentSchema,
  updateShipmentSchema,
  respondPriceSchema,
  cancelShipmentSchema,
} = require('../validations/shipmentValidation');

router.use(authenticate, requireRole('cargo_owner'));

router.post('/', validate(createShipmentSchema), shipmentController.create);
router.get('/', shipmentController.getMine);
router.get('/:id', shipmentController.getOne);
router.patch('/:id', validate(updateShipmentSchema), shipmentController.update);
router.patch('/:id/respond-price', validate(respondPriceSchema), shipmentController.respondToPrice);
router.patch('/:id/cancel', validate(cancelShipmentSchema), shipmentController.cancel);
router.patch('/:id/confirm-delivery', shipmentController.confirmDelivery);

module.exports = router;
