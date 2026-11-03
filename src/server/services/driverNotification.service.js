const { DriverNotification } = require('../models');

// اعلان برای راننده؛ هر رویدادی که به مأموریت یا وضعیت راننده مربوط است اینجا ثبت می‌شود.
async function notifyDriver(driverId, { title, message, shipmentId = null }) {
  if (!driverId) return null;
  return DriverNotification.create({
    driverId,
    title,
    message,
    shipmentId,
  });
}

async function listForDriver(driverId) {
  return DriverNotification.findAll({
    where: { driverId },
    order: [['createdAt', 'DESC']],
    limit: 100,
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
