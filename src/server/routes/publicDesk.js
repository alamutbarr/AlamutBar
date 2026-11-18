const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');
const AppError = require('../utils/AppError');
const { authMiddleware } = require('../middleware/auth');
const desk = require('../admin/desk');
const { User, CargoOwner } = require('../models');

const router = express.Router();

router.get('/articles', asyncHandler(async (req, res) => {
  const rows = await desk.listArticles();
  success(res, { data: rows.filter((row) => row.phase === 'published') });
}));

router.get('/articles/:slug', asyncHandler(async (req, res) => {
  const article = await desk.publicArticle(req.params.slug);
  if (!article) throw new AppError('مقاله پیدا نشد.', 404);
  success(res, { data: article });
}));

router.post('/contact', asyncHandler(async (req, res) => {
  const data = await desk.ingestContact(req.body);
  success(res, { statusCode: 201, message: 'درخواست شما ثبت شد. همکاران ما تماس می‌گیرند.', data });
}));

router.get('/support-tickets', authMiddleware, asyncHandler(async (req, res) => {
  if (req.user.role !== 'cargo_owner') throw new AppError('این بخش برای صاحب بار است.', 403);
  success(res, { data: await desk.listTickets({ ownerId: req.user.id }) });
}));

router.post('/support-tickets', authMiddleware, asyncHandler(async (req, res) => {
  if (req.user.role !== 'cargo_owner') throw new AppError('این بخش برای صاحب بار است.', 403);
  const user = await User.findByPk(req.user.id, { include: [CargoOwner] });
  const name = [user?.CargoOwner?.first_name, user?.CargoOwner?.last_name].filter(Boolean).join(' ') || 'صاحب بار';
  success(res, {
    statusCode: 201,
    message: 'درخواست پشتیبانی ثبت شد.',
    data: await desk.saveTicket({ id: req.user.id, fullName: name }, req.body, 'owner'),
  });
}));

router.post('/support-tickets/:id/replies', authMiddleware, asyncHandler(async (req, res) => {
  if (req.user.role !== 'cargo_owner') throw new AppError('این بخش برای صاحب بار است.', 403);
  const user = await User.findByPk(req.user.id, { include: [CargoOwner] });
  const name = [user?.CargoOwner?.first_name, user?.CargoOwner?.last_name].filter(Boolean).join(' ') || 'صاحب بار';
  success(res, { data: await desk.replyTicket({ id: req.user.id, fullName: name }, req.params.id, req.body, 'owner') });
}));

module.exports = router;
