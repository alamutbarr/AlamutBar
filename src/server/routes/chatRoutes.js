const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { Shipment, Message } = require('../models');

const router = express.Router();

function roleOf(user, shipment) {
  if (user.role === 'cargo_owner' && String(shipment.owner_id) === String(user.id)) return 'owner';
  if (user.role === 'driver' && shipment.driver_id && String(shipment.driver_id) === String(user.id)) return 'driver';
  return null;
}

function present(row) {
  const d = row.toJSON ? row.toJSON() : row;
  return {
    id: d.id,
    shipmentId: d.shipment_id,
    senderRole: d.sender_role,
    senderId: d.sender_id,
    body: d.body,
    createdAt: d.createdAt,
  };
}

router.get('/:shipmentId', authMiddleware, async (req, res) => {
  const shipment = await Shipment.findByPk(req.params.shipmentId);
  if (!shipment) return res.status(404).json({ error: 'بار پیدا نشد' });
  const role = roleOf(req.user, shipment);
  if (!role) {
    return res.status(403).json({ error: 'گفتگو بعد از قبول بار بین صاحب کالا و راننده باز می‌شود.' });
  }
  const rows = await Message.findAll({
    where: { shipment_id: shipment.id },
    order: [['createdAt', 'ASC']],
  });
  return res.json({ messages: rows.map(present), role });
});

module.exports = router;
module.exports.roleOf = roleOf;
module.exports.present = present;
