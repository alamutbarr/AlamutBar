const express = require('express');
const router = express.Router();
const operatorController = require('../controllers/operatorController');
const authenticate = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/roleMiddleware');
const validate = require('../middlewares/validateMiddleware');
const { proposePriceSchema, advanceStatusSchema } = require('../validations/shipmentValidation');

// TODO: این مسیر موقت است و باید در پنل مستقل اپراتور جای بگیرد.
router.use(authenticate, requireRole('operator', 'admin'));
router.patch('/shipments/:id/price', validate(proposePriceSchema), operatorController.proposePrice);
router.patch('/shipments/:id/status', validate(advanceStatusSchema), operatorController.advanceStatus);

module.exports = router;
