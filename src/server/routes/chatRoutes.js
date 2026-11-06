const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { Shipment } = require('../models');
const chat = require('../chat/service');

const router = express.Router();

router.get('/:shipmentId', authMiddleware, async (req, res) => {
  const channel = req.query.channel === 'driver_operator' ? 'driver_operator' : 'owner_operator';
  const shipment = await Shipment.findByPk(req.params.shipmentId);
  if (!shipment) return res.status(404).json({ error: 'بار پیدا نشد' });
  const party = chat.partyOf(req.user, shipment, channel);
  if (!party) return res.status(403).json({ error: 'به این گفتگو دسترسی ندارید.' });
  const messages = await chat.history(shipment.id, channel);
  return res.json({ messages, role: party, channel });
});

router.post('/:shipmentId', authMiddleware, async (req, res) => {
  const channel = req.body.channel === 'driver_operator' ? 'driver_operator' : 'owner_operator';
  const shipment = await Shipment.findByPk(req.params.shipmentId);
  if (!shipment) return res.status(404).json({ error: 'بار پیدا نشد' });
  const party = chat.partyOf(req.user, shipment, channel);
  if (!party) return res.status(403).json({ error: 'به این گفتگو دسترسی ندارید.' });
  try {
    const message = await chat.postMessage({
      shipment,
      channel,
      senderRole: party,
      senderId: req.user.id,
      body: req.body.body,
    });
    return res.status(201).json({ message });
  } catch (error) {
    return res.status(error.statusCode || 400).json({ error: error.message });
  }
});

module.exports = router;
module.exports.partyOf = chat.partyOf;
module.exports.present = chat.present;
