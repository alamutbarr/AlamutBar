const { DriverNotification, Shipment } = require('../models');

// اعلان برای راننده؛ هر رویدادی که به مأموریت یا وضعیت راننده مربوط است اینجا ثبت می‌شود.
async function notifyDriver(driverId, { title, message, shipmentId = null, kind = 'info' }) {
  if (!driverId) return null;
  return DriverNotification.create({
    driverId,
    title: String(title || '').slice(0, 150),
    message: String(message || '').slice(0, 500),
    shipmentId,
    kind,
  });
}

async function listForDriver(driverId) {
  const rows = await DriverNotification.findAll({
    where: { driverId },
    order: [['createdAt', 'DESC']],
    limit: 100,
  });
  const offerIds = rows
    .filter((row) => row.kind === 'load_offer' && row.shipmentId)
    .map((row) => row.shipmentId);
  const shipments = offerIds.length
    ? await Shipment.findAll({
      where: { id: offerIds },
      attributes: ['id', 'offered_driver_id', 'driver_id'],
    })
    : [];
  const byId = new Map(shipments.map((row) => [String(row.id), row]));
  return rows.map((row) => {
    const data = row.toJSON();
    if (data.kind === 'load_offer') {
      const shipment = byId.get(String(data.shipmentId));
      data.offerOpen = Boolean(
        shipment && !shipment.driver_id && String(shipment.offered_driver_id) === String(driverId),
      );
    }
    return data;
  });
}

async function markAsRead(driverId, notificationId) {
  const notification = await DriverNotification.findOne({ where: { id: notificationId, driverId } });
  if (!notification) return null;
  if (!notification.isRead) {
    notification.isRead = true;
    await notification.save();
  }
  return notification;
}

async function markAllAsRead(driverId) {
  await DriverNotification.update({ isRead: true }, { where: { driverId, isRead: false } });
  return listForDriver(driverId);
}

module.exports = { notifyDriver, listForDriver, markAsRead, markAllAsRead };
