const { Op } = require('sequelize');
const { Message, Shipment, Driver, User } = require('../models');

const CHANNELS = ['driver_operator', 'owner_operator'];

function present(row) {
  const data = row.toJSON ? row.toJSON() : row;
  return {
    id: data.id,
    shipmentId: data.shipment_id,
    channel: data.channel,
    senderRole: data.sender_role,
    senderId: data.sender_id,
    body: data.body,
    createdAt: data.createdAt,
  };
}

function partyOf(user, shipment, channel) {
  if (!shipment || !CHANNELS.includes(channel)) return null;
  const role = user.role;
  const kind = user.kind;
  if (kind === 'admin' || role === 'admin') return 'operator';
  if ((role === 'driver' || kind === 'driver') && channel === 'driver_operator' && shipment.driver_id && String(shipment.driver_id) === String(user.id)) {
    return 'driver';
  }
  if (role === 'cargo_owner' && channel === 'owner_operator' && String(shipment.owner_id) === String(user.id)) {
    return 'owner';
  }
  return null;
}

async function history(shipmentId, channel) {
  const rows = await Message.findAll({
    where: { shipment_id: shipmentId, channel },
    order: [['createdAt', 'ASC']],
  });
  return rows.map(present);
}

async function postMessage({ shipment, channel, senderRole, senderId, body }) {
  const text = String(body || '').trim();
  if (!text || text.length > 2000) {
    const error = new Error('متن پیام معتبر نیست.');
    error.statusCode = 400;
    throw error;
  }
  const saved = await Message.create({
    shipment_id: shipment.id,
    channel,
    sender_role: senderRole,
    sender_id: senderId,
    body: text,
  });
  return present(saved);
}

async function inbox() {
  const shipments = await Shipment.findAll({
    include: [
      { model: User, as: 'owner', attributes: ['id', 'phone_number'] },
      { model: Driver, as: 'driver', attributes: ['id', 'firstName', 'lastName', 'phoneNumber'] },
    ],
    order: [['updatedAt', 'DESC']],
    limit: 40,
  });
  const ids = shipments.map((item) => item.id);
  const messages = ids.length
    ? await Message.findAll({
      where: { shipment_id: { [Op.in]: ids } },
      order: [['createdAt', 'DESC']],
    })
    : [];
  return shipments.map((shipment) => {
    const related = messages.filter((item) => item.shipment_id === shipment.id);
    const last = (channel) => related.find((item) => item.channel === channel);
    const driver = shipment.driver;
    return {
      id: shipment.id,
      trackingCode: shipment.tracking_code,
      ownerPhone: shipment.owner?.phone_number || null,
      driverName: driver ? [driver.firstName, driver.lastName].filter(Boolean).join(' ') : null,
      channels: {
        owner_operator: last('owner_operator') ? present(last('owner_operator')) : null,
        driver_operator: last('driver_operator') ? present(last('driver_operator')) : null,
      },
    };
  }).sort((a, b) => {
    const score = (row) => (row.channels.owner_operator ? 1 : 0) + (row.channels.driver_operator ? 1 : 0);
    return score(b) - score(a);
  });
}

module.exports = { CHANNELS, present, partyOf, history, postMessage, inbox };
