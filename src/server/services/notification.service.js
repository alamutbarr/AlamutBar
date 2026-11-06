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

async function unreadCount(userId) {
  return Notification.count({ where: { user_id: userId, is_read: false } });
}

async function markAllAsRead(userId) {
  const unread = await unreadCount(userId);
  if (unread) {
    await Notification.update({ is_read: true }, { where: { user_id: userId, is_read: false } });
  }
  return listForUser(userId);
}

module.exports = { notify, listForUser, markAsRead, markAllAsRead, markAllRead: markAllAsRead, unreadCount };
