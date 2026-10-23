const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');
const notificationService = require('../services/notification.service');

const getMine = asyncHandler(async (req, res) => {
  const notifications = await notificationService.listForUser(req.user.id);
  success(res, { data: notifications });
});

const markAsRead = asyncHandler(async (req, res) => {
  const notification = await notificationService.markAsRead(req.user.id, req.params.id);
  success(res, { data: notification });
});

module.exports = { getMine, markAsRead };
