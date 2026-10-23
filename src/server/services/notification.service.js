const { Notification } = require('../models');

async function notify(userId, { title, message, shipmentId = null }) {
  return Notification.create({ user_id: userId, title, message, shipment_id: shipmentId });
}

async function listForUser(userId) {
  return Notification.findAll({
    where: { user_id: userId },
    order: [['createdAt', 'DESC']],
  });
}

async function markAsRead(userId, notificationId) {
  const notification = await Notification.findOne({ where: { id: notificationId, user_id: userId } });
  if (!notification) return null;
  notification.is_read = true;
  await notification.save();
  return notification;
}

module.exports = { notify, listForUser, markAsRead };
