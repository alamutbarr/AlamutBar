const express = require('express');
const multer = require('multer');
const path = require('path');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');
const AppError = require('../utils/AppError');
const { requirePermission } = require('./guard');
const desk = require('./desk');
const orderOps = require('./orderOps');
const { Driver } = require('../models');
const { can } = require('./permissions');

const router = express.Router();

const documentUpload = multer({
  dest: path.join(__dirname, '..', '..', 'uploads'),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowed.includes(file.mimetype)) {
      cb(new Error('فقط PDF، JPG و PNG پذیرفته می‌شود.'));
      return;
    }
    cb(null, true);
  },
});

router.get('/crm/leads', requirePermission('crm'), asyncHandler(async (req, res) => {
  success(res, { data: await desk.listLeads(req.query) });
}));

router.post('/crm/leads', requirePermission('crm'), asyncHandler(async (req, res) => {
  success(res, { message: 'سرنخ ذخیره شد.', data: await desk.saveLead(req.admin, req.body) });
}));

router.post('/crm/leads/:id/activities', requirePermission('crm'), asyncHandler(async (req, res) => {
  success(res, { message: 'ارتباط ثبت شد.', data: await desk.addActivity(req.admin, req.params.id, req.body) });
}));

router.get('/crm/followups', requirePermission('crm'), asyncHandler(async (req, res) => {
  success(res, { data: await desk.listFollowups() });
}));

router.post('/crm/followups', requirePermission('crm'), asyncHandler(async (req, res) => {
  success(res, { message: 'پیگیری ثبت شد.', data: await desk.saveFollowup(req.admin, req.body) });
}));

router.patch('/crm/followups/:id', requirePermission('crm'), asyncHandler(async (req, res) => {
  success(res, { data: await desk.toggleFollowup(req.admin, req.params.id, req.body.done) });
}));

router.get('/incidents', requirePermission('incidents'), asyncHandler(async (req, res) => {
  success(res, { data: await desk.listIncidents() });
}));

router.post('/incidents', requirePermission('incidents'), asyncHandler(async (req, res) => {
  success(res, { statusCode: 201, message: 'رخداد ثبت شد.', data: await desk.saveIncident(req.admin, req.body) });
}));

router.patch('/incidents/:id', requirePermission('incidents'), asyncHandler(async (req, res) => {
  success(res, { message: 'رخداد به‌روز شد.', data: await desk.updateIncident(req.admin, req.params.id, req.body) });
}));

router.get('/finance/summary', requirePermission('finance'), asyncHandler(async (req, res) => {
  success(res, { data: await desk.financeSummary() });
}));

router.get('/finance/invoices', requirePermission('finance'), asyncHandler(async (req, res) => {
  success(res, { data: await desk.listInvoices() });
}));

router.post('/finance/invoices/:id/payments', requirePermission('finance'), asyncHandler(async (req, res) => {
  success(res, { message: 'پرداخت ثبت شد.', data: await desk.recordPayment(req.admin, req.params.id, req.body) });
}));

router.get('/tickets', requirePermission('tickets'), asyncHandler(async (req, res) => {
  success(res, { data: await desk.listTickets() });
}));

router.post('/tickets', requirePermission('tickets'), asyncHandler(async (req, res) => {
  const actor = { id: req.admin.id, fullName: req.admin.fullName };
  success(res, { statusCode: 201, message: 'تیکت ثبت شد.', data: await desk.saveTicket(actor, req.body, 'operator') });
}));

router.post('/tickets/:id/replies', requirePermission('tickets'), asyncHandler(async (req, res) => {
  success(res, { data: await desk.replyTicket({ id: req.admin.id, fullName: req.admin.fullName }, req.params.id, req.body, 'operator') });
}));

router.post('/tickets/:id/close', requirePermission('tickets'), asyncHandler(async (req, res) => {
  success(res, { message: 'تیکت بسته شد.', data: await desk.closeTicket(req.admin, req.params.id) });
}));

router.get('/notifications', requirePermission('notifications'), asyncHandler(async (req, res) => {
  success(res, { data: await desk.listNotices(req.admin.id) });
}));

router.post('/notifications/read', requirePermission('notifications'), asyncHandler(async (req, res) => {
  await desk.markNoticesRead(req.admin.id);
  success(res, { message: 'اعلان‌ها خوانده شدند.' });
}));

router.get('/articles', requirePermission('content'), asyncHandler(async (req, res) => {
  success(res, { data: await desk.listArticles(req.query) });
}));

router.post('/articles', requirePermission('content'), asyncHandler(async (req, res) => {
  success(res, { message: 'مقاله ذخیره شد.', data: await desk.saveArticle(req.admin, req.body) });
}));

router.get('/contacts', requirePermission('contacts'), asyncHandler(async (req, res) => {
  success(res, { data: await desk.listContacts() });
}));

router.get('/emails', requirePermission('contacts'), asyncHandler(async (req, res) => {
  const includeBody = can(req.admin.roles, 'admins.manage');
  success(res, { data: await desk.listEmails(includeBody) });
}));

router.patch('/emails/:id', requirePermission('contacts'), asyncHandler(async (req, res) => {
  success(res, { data: await desk.setEmailStatus(req.admin, req.params.id, req.body.status) });
}));

router.get('/control-room', requirePermission('control'), asyncHandler(async (req, res) => {
  success(res, { data: await desk.controlRoom() });
}));

router.get('/team', requirePermission('team.read'), asyncHandler(async (req, res) => {
  success(res, { data: await desk.teamDirectory(req.query) });
}));

router.post('/team/drivers/:id/account', requirePermission('drivers.documents'), asyncHandler(async (req, res) => {
  success(res, { data: await desk.setAccountVerified(req.admin, req.params.id, req.body.verified) });
}));

router.post('/team/drivers/:id/dossier', requirePermission('drivers.documents'), asyncHandler(async (req, res) => {
  success(res, { message: 'نتیجه پرونده ثبت شد.', data: await desk.reviewDossier(req.admin, req.params.id, req.body) });
}));

router.patch('/team/drivers/:id/profile', requirePermission('drivers.documents'), asyncHandler(async (req, res) => {
  const driver = await desk.saveDriverProfile(req.admin, req.params.id, req.body);
  success(res, { message: 'پرونده راننده ذخیره شد.', data: orderOps.presentDriver(driver) });
}));

router.post('/team/drivers/:id/fleet', requirePermission('drivers.documents'), documentUpload.single('file'), asyncHandler(async (req, res) => {
  const driver = await Driver.findByPk(req.params.id);
  if (!driver) throw new AppError('راننده پیدا نشد.', 404);
  if (!req.file) throw new AppError('فایل مدرک را انتخاب کنید.', 400);
  const fleet = await desk.uploadFleet(driver, req.body.key, `/uploads/${req.file.filename}`);
  success(res, { message: 'مدرک بارگذاری شد.', data: fleet });
}));

router.post('/team/drivers/:id/fleet/review', requirePermission('drivers.documents'), asyncHandler(async (req, res) => {
  success(res, { data: await desk.decideFleet(req.admin, req.params.id, req.body) });
}));

router.get('/catalog', requirePermission('orders.create'), asyncHandler(async (req, res) => {
  success(res, { data: await desk.catalog(req.query) });
}));

router.get('/catalog/cities/:id/zones', requirePermission('orders.create'), asyncHandler(async (req, res) => {
  const zones = await desk.cityZones(req.params.id);
  success(res, { data: zones.map((zone) => ({ id: zone.id, name: zone.name })) });
}));

router.post('/orders', requirePermission('orders.create'), asyncHandler(async (req, res) => {
  success(res, { statusCode: 201, message: 'درخواست حمل ثبت شد.', data: await orderOps.createOrder(req.admin, req.body) });
}));

router.patch('/orders/:id/details', requirePermission('orders.create'), asyncHandler(async (req, res) => {
  success(res, { message: 'مشخصات بار ویرایش شد.', data: await orderOps.editOrder(req.admin, req.params.id, req.body) });
}));

router.post('/orders/:id/offers', requirePermission('offers'), asyncHandler(async (req, res) => {
  success(res, { message: 'پیشنهاد پذیرفته شد.', data: await orderOps.acceptFareOffer(req.admin, req.params.id, req.body) });
}));

router.post('/orders/:id/checklist', requirePermission('inspections'), asyncHandler(async (req, res) => {
  success(res, { message: 'چک‌لیست بازرسی ثبت شد.', data: await orderOps.recordChecklist(req.admin, req.params.id, req.body) });
}));

router.post('/orders/:id/documents', requirePermission('orders.documents'), documentUpload.single('file'), asyncHandler(async (req, res) => {
  success(res, { statusCode: 201, message: 'سند ذخیره شد.', data: await orderOps.addShipmentDocument(req.admin, req.params.id, req.file) });
}));

module.exports = router;
