const { Op } = require('sequelize');
const AppError = require('../utils/AppError');
const { normalizePhone } = require('./phone');
const { audit } = require('./audit');
const { centerOf } = require('../services/cityBounds');
const {
  Lead, CrmActivity, FollowUp, Incident, Invoice, InvoicePayment, SupportTicket, SupportMessage,
  AdminNotification, Article, ContactRequest, OutboundEmail, Shipment, Driver, User, CargoOwner,
  Inspector, City, Zone, VehicleType, Admin,
} = require('../models');
const {
  LEAD_STAGES, INCIDENT_KINDS, INCIDENT_STATUSES, TICKET_PRIORITIES,
  articlePhase, invoiceLedger, slugify, readFleet, fleetReady, reviewFleet, upsertFleet,
  documentsExpired, marketOpen,
} = require('./deskRules');
const { ACTIVE_TRIP, PRE_DEPARTURE, WORKFLOW_LABELS } = require('./workflow');

function text(value, label, min = 2, max = 3000) {
  const body = String(value || '').trim();
  if (body.length < min || body.length > max) throw new AppError(`${label} را درست وارد کنید.`, 400);
  return body;
}

async function pushNotice({ title, body, shipmentId = null, adminId = null }) {
  return AdminNotification.create({
    adminId,
    title: String(title).slice(0, 150),
    body: String(body).slice(0, 500),
    shipmentId,
  });
}

function presentLead(row) {
  const data = row.toJSON ? row.toJSON() : row;
  return {
    id: data.id,
    name: data.name,
    company: data.company || '',
    phone: data.phone,
    stage: data.stage,
    source: data.source,
    description: data.description || '',
    assignedAdminId: data.assignedAdminId,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    activities: (data.activities || []).map((item) => ({
      id: item.id,
      kind: item.kind,
      body: item.body,
      createdAt: item.createdAt,
    })),
  };
}

async function listLeads(query = {}) {
  const where = {};
  if (query.stage && LEAD_STAGES.includes(query.stage)) where.stage = query.stage;
  if (query.q) {
    const q = `%${String(query.q).trim()}%`;
    where[Op.or] = [
      { name: { [Op.like]: q } },
      { company: { [Op.like]: q } },
      { phone: { [Op.like]: q } },
    ];
  }
  const rows = await Lead.findAll({
    where,
    include: [{ model: CrmActivity, as: 'activities', separate: true, limit: 20, order: [['createdAt', 'DESC']] }],
    order: [['updatedAt', 'DESC']],
    limit: 100,
  });
  return rows.map(presentLead);
}

async function saveLead(admin, body) {
  const name = text(body.name, 'نام', 2, 120);
  const phone = normalizePhone(body.phone);
  if (body.stage && !LEAD_STAGES.includes(body.stage)) throw new AppError('مرحله سرنخ نامعتبر است.', 400);
  const payload = {
    name,
    company: String(body.company || '').trim().slice(0, 120),
    phone,
    stage: body.stage || 'new',
    source: body.source || 'manual',
    description: String(body.description || '').trim().slice(0, 3000),
    assignedAdminId: body.assignedAdminId ? Number(body.assignedAdminId) : null,
  };
  const lead = body.id ? await Lead.findByPk(body.id) : null;
  if (body.id && !lead) throw new AppError('سرنخ پیدا نشد.', 404);
  if (lead) {
    const previous = lead.stage;
    Object.assign(lead, payload);
    await lead.save();
    if (previous !== lead.stage) {
      await CrmActivity.create({
        leadId: lead.id,
        adminId: admin.id,
        kind: 'stage',
        body: `${previous} → ${lead.stage}`,
      });
    }
    await audit(admin, 'crm.lead', 'lead', lead.id, { stage: lead.stage });
    return presentLead(lead);
  }
  const created = await Lead.create({ ...payload, createdByAdminId: admin.id });
  await audit(admin, 'crm.lead', 'lead', created.id, { stage: created.stage });
  return presentLead(created);
}

async function addActivity(admin, leadId, body) {
  const lead = await Lead.findByPk(leadId);
  if (!lead) throw new AppError('سرنخ پیدا نشد.', 404);
  const kind = ['call', 'note', 'meeting'].includes(body.kind) ? body.kind : 'note';
  const activity = await CrmActivity.create({
    leadId: lead.id,
    adminId: admin.id,
    kind,
    body: text(body.body, 'شرح ارتباط', 2, 3000),
  });
  return { id: activity.id, kind: activity.kind, body: activity.body, createdAt: activity.createdAt };
}

async function listFollowups() {
  const rows = await FollowUp.findAll({ order: [['done', 'ASC'], ['dueAt', 'ASC']], limit: 200 });
  const now = Date.now();
  return rows.map((row) => ({
    id: row.id,
    leadId: row.leadId,
    shipmentId: row.shipmentId,
    title: row.title,
    assignedAdminId: row.assignedAdminId,
    dueAt: row.dueAt,
    done: row.done,
    overdue: !row.done && new Date(row.dueAt).getTime() < now,
    completedAt: row.completedAt,
  }));
}

async function saveFollowup(admin, body) {
  const title = text(body.title, 'موضوع پیگیری', 2, 180);
  if (!body.dueAt) throw new AppError('سررسید پیگیری لازم است.', 400);
  const dueAt = new Date(body.dueAt);
  if (Number.isNaN(dueAt.getTime())) throw new AppError('سررسید پیگیری نامعتبر است.', 400);
  const row = await FollowUp.create({
    title,
    dueAt,
    leadId: body.leadId ? Number(body.leadId) : null,
    shipmentId: body.shipmentId ? Number(body.shipmentId) : null,
    assignedAdminId: body.assignedAdminId ? Number(body.assignedAdminId) : admin.id,
    createdByAdminId: admin.id,
  });
  await audit(admin, 'crm.followup', 'followup', row.id, { title });
  return row;
}

async function toggleFollowup(admin, id, done) {
  const row = await FollowUp.findByPk(id);
  if (!row) throw new AppError('پیگیری پیدا نشد.', 404);
  row.done = Boolean(done);
  row.completedAt = row.done ? new Date() : null;
  await row.save();
  await audit(admin, 'crm.followup', 'followup', row.id, { done: row.done });
  return row;
}

function presentIncident(row) {
  const data = row.toJSON ? row.toJSON() : row;
  return {
    id: data.id,
    shipmentId: data.shipmentId,
    trackingCode: data.Shipment?.tracking_code || data.trackingCode || null,
    kind: data.kind,
    severity: data.severity,
    description: data.description,
    status: data.status,
    resolution: data.resolution || '',
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

async function listIncidents() {
  const rows = await Incident.findAll({
    include: [{ model: Shipment, attributes: ['id', 'tracking_code'] }],
    order: [['createdAt', 'DESC']],
    limit: 200,
  });
  return rows.map(presentIncident);
}

async function saveIncident(admin, body) {
  if (!INCIDENT_KINDS.includes(body.kind)) throw new AppError('نوع رخداد نامعتبر است.', 400);
  const severity = body.severity === 'critical' ? 'critical' : 'normal';
  const shipment = await Shipment.findByPk(body.shipmentId);
  if (!shipment) throw new AppError('محموله پیدا نشد.', 404);
  const row = await Incident.create({
    shipmentId: shipment.id,
    adminId: admin.id,
    kind: body.kind,
    severity,
    description: text(body.description, 'شرح رخداد', 3, 3000),
  });
  await audit(admin, 'incident.create', 'incident', row.id, { kind: row.kind, severity });
  if (severity === 'critical') {
    await pushNotice({
      title: 'رخداد بحرانی',
      body: `بار ${shipment.tracking_code} تا رفع رخداد بحرانی نمی‌تواند حرکت یا تکمیل شود.`,
      shipmentId: shipment.id,
    });
  }
  return presentIncident({ ...row.toJSON(), Shipment: shipment });
}

async function updateIncident(admin, id, body) {
  const row = await Incident.findByPk(id);
  if (!row) throw new AppError('رخداد پیدا نشد.', 404);
  if (body.status && !INCIDENT_STATUSES.includes(body.status)) throw new AppError('وضعیت رخداد نامعتبر است.', 400);
  if (body.status) row.status = body.status;
  if (body.resolution != null) row.resolution = String(body.resolution).trim().slice(0, 3000);
  if (row.status === 'resolved') {
    if (!row.resolution) throw new AppError('برای بستن رخداد، اقدام اصلاحی را بنویسید.', 400);
    row.resolvedByAdminId = admin.id;
  }
  await row.save();
  await audit(admin, 'incident.resolve', 'incident', row.id, { status: row.status });
  return presentIncident(row);
}

async function openCritical(shipmentId) {
  return Incident.count({
    where: { shipmentId, severity: 'critical', status: { [Op.ne]: 'resolved' } },
  });
}

function presentInvoice(invoice, payments) {
  const ledger = invoiceLedger(invoice.amount, payments);
  return {
    id: invoice.id,
    shipmentId: invoice.shipmentId,
    trackingCode: invoice.Shipment?.tracking_code || null,
    ...ledger,
    status: ledger.settled ? 'paid' : 'unpaid',
    reference: invoice.reference || '',
    paidAt: invoice.paidAt,
    payments: payments.map((row) => ({
      id: row.id,
      amount: Number(row.amount),
      reference: row.reference,
      createdAt: row.createdAt,
    })),
  };
}

async function listInvoices() {
  const rows = await Invoice.findAll({
    include: [
      { model: Shipment, attributes: ['id', 'tracking_code'] },
      { model: InvoicePayment, as: 'payments' },
    ],
    order: [['createdAt', 'DESC']],
    limit: 200,
  });
  return rows.map((row) => presentInvoice(row, row.payments || []));
}

async function financeSummary() {
  const rows = await listInvoices();
  return {
    received: rows.reduce((sum, row) => sum + row.paid, 0),
    outstanding: rows.reduce((sum, row) => sum + row.remaining, 0),
    count: rows.length,
  };
}

async function recordPayment(admin, invoiceId, body) {
  const invoice = await Invoice.findByPk(invoiceId, { include: [{ model: InvoicePayment, as: 'payments' }] });
  if (!invoice) throw new AppError('صورتحساب پیدا نشد.', 404);
  const amount = Number(body.amount);
  const reference = text(body.reference, 'شماره مرجع', 5, 100);
  if (!Number.isInteger(amount) || amount < 1) throw new AppError('مبلغ پرداخت باید بیشتر از صفر باشد.', 400);
  const ledger = invoiceLedger(invoice.amount, invoice.payments);
  if (amount > ledger.remaining) throw new AppError('مبلغ بیشتر از مانده صورتحساب است.', 400);
  if (invoice.payments.some((row) => row.reference === reference)) {
    throw new AppError('این مرجع قبلاً ثبت شده است.', 400);
  }
  const payment = await InvoicePayment.create({ invoiceId: invoice.id, amount, reference, adminId: admin.id });
  const next = invoiceLedger(invoice.amount, [...invoice.payments, payment]);
  invoice.status = next.settled ? 'paid' : 'unpaid';
  invoice.reference = reference;
  invoice.paidAt = next.settled ? new Date() : null;
  await invoice.save();
  await audit(admin, 'invoice.payment', 'invoice', invoice.id, { amount, reference });
  return presentInvoice(invoice, [...invoice.payments, payment]);
}

async function ensureInvoice(shipment) {
  const amount = Number(shipment.final_price || shipment.operator_price || shipment.proposed_price || 0);
  if (!amount) return null;
  const [invoice] = await Invoice.findOrCreate({
    where: { shipmentId: shipment.id },
    defaults: { shipmentId: shipment.id, amount, status: 'unpaid' },
  });
  if (Number(invoice.amount) !== amount && invoice.status !== 'paid') {
    invoice.amount = amount;
    await invoice.save();
  }
  return invoice;
}

function presentTicket(row) {
  const data = row.toJSON ? row.toJSON() : row;
  return {
    id: data.id,
    subject: data.subject,
    priority: data.priority,
    status: data.status,
    phone: data.phone || '',
    ownerId: data.ownerId,
    createdAt: data.createdAt,
    messages: (data.messages || []).map((item) => ({
      id: item.id,
      authorRole: item.authorRole,
      authorName: item.authorName,
      body: item.body,
      createdAt: item.createdAt,
    })),
  };
}

async function listTickets(where = {}) {
  const rows = await SupportTicket.findAll({
    where,
    include: [{ model: SupportMessage, as: 'messages' }],
    order: [['updatedAt', 'DESC']],
    limit: 200,
  });
  return rows.map(presentTicket);
}

async function saveTicket(actor, body, role) {
  const subject = text(body.subject, 'موضوع', 2, 140);
  const priority = body.priority === 'urgent' ? 'urgent' : 'normal';
  if (!TICKET_PRIORITIES.includes(priority)) throw new AppError('اولویت نامعتبر است.', 400);
  const ticket = await SupportTicket.create({
    subject,
    priority,
    phone: body.phone ? normalizePhone(body.phone) : null,
    ownerId: role === 'owner' ? actor.id : (body.ownerId || null),
    driverId: role === 'driver' ? actor.id : null,
    createdByAdminId: role === 'operator' ? actor.id : null,
  });
  await SupportMessage.create({
    ticketId: ticket.id,
    authorRole: role,
    authorName: actor.fullName || actor.name || 'کاربر',
    body: text(body.body, 'توضیح درخواست', 2, 4000),
  });
  if (role !== 'operator') {
    await pushNotice({ title: 'تیکت پشتیبانی', body: subject });
  }
  return (await listTickets({ id: ticket.id }))[0];
}

async function replyTicket(actor, id, body, role) {
  const ticket = await SupportTicket.findByPk(id);
  if (!ticket) throw new AppError('تیکت پیدا نشد.', 404);
  if (role === 'owner' && String(ticket.ownerId) !== String(actor.id)) throw new AppError('این تیکت برای شما نیست.', 403);
  if (ticket.status === 'closed') throw new AppError('تیکت بسته شده است.', 400);
  await SupportMessage.create({
    ticketId: ticket.id,
    authorRole: role,
    authorName: actor.fullName || actor.name || 'کاربر',
    body: text(body.body, 'پاسخ', 1, 4000),
  });
  ticket.changed('updatedAt', true);
  await ticket.save();
  return (await listTickets({ id: ticket.id }))[0];
}

async function closeTicket(admin, id) {
  const ticket = await SupportTicket.findByPk(id);
  if (!ticket) throw new AppError('تیکت پیدا نشد.', 404);
  ticket.status = 'closed';
  await ticket.save();
  await audit(admin, 'ticket.close', 'ticket', ticket.id, {});
  return (await listTickets({ id: ticket.id }))[0];
}

async function listNotices(adminId) {
  return AdminNotification.findAll({
    where: { [Op.or]: [{ adminId: null }, { adminId }] },
    order: [['createdAt', 'DESC']],
    limit: 100,
  });
}

async function unreadNoticeCount(adminId) {
  return AdminNotification.count({
    where: { isRead: false, [Op.or]: [{ adminId: null }, { adminId }] },
  });
}

async function markNoticesRead(adminId) {
  await AdminNotification.update({ isRead: true }, {
    where: { isRead: false, [Op.or]: [{ adminId: null }, { adminId }] },
  });
}

async function listArticles(query = {}) {
  const where = {};
  if (query.q) where.title = { [Op.like]: `%${String(query.q).trim()}%` };
  const rows = await Article.findAll({ where, order: [['updatedAt', 'DESC']], limit: 100 });
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    summary: row.summary,
    body: row.body,
    category: row.category,
    status: row.status,
    phase: articlePhase(row.status, row.publishedAt),
    publishedAt: row.publishedAt,
    updatedAt: row.updatedAt,
  }));
}

async function saveArticle(admin, body) {
  const title = text(body.title, 'عنوان', 2, 180);
  const summary = text(body.summary, 'خلاصه', 2, 350);
  const articleBody = text(body.body, 'متن مقاله', 2, 20000);
  const status = body.status === 'published' ? 'published' : 'draft';
  let slug = slugify(body.slug || title);
  if (!slug) slug = `article-${Date.now()}`;
  const publishedAt = body.publishedAt ? new Date(body.publishedAt) : (status === 'published' ? new Date() : null);
  if (body.publishedAt && Number.isNaN(publishedAt.getTime())) throw new AppError('زمان انتشار نامعتبر است.', 400);
  const existing = body.id ? await Article.findByPk(body.id) : null;
  if (body.id && !existing) throw new AppError('مقاله پیدا نشد.', 404);
  const clash = await Article.findOne({ where: { slug, ...(existing ? { id: { [Op.ne]: existing.id } } : {}) } });
  if (clash) throw new AppError('این نشانی انگلیسی قبلاً استفاده شده است.', 400);
  const payload = {
    title,
    slug,
    summary,
    body: articleBody,
    category: String(body.category || 'راهنمای حمل').trim().slice(0, 60) || 'راهنمای حمل',
    status,
    publishedAt,
  };
  const row = existing || Article.build({ createdByAdminId: admin.id });
  Object.assign(row, payload);
  await row.save();
  await audit(admin, 'content.article', 'article', row.id, { status: row.status, slug: row.slug });
  return (await listArticles()).find((item) => item.id === row.id);
}

async function publicArticle(slug) {
  const row = await Article.findOne({ where: { slug: String(slug || '') } });
  if (!row || articlePhase(row.status, row.publishedAt) !== 'published') return null;
  return {
    title: row.title,
    slug: row.slug,
    summary: row.summary,
    body: row.body,
    category: row.category,
    publishedAt: row.publishedAt,
  };
}

async function ingestContact(body) {
  const name = text(body.name, 'نام', 2, 120);
  const phone = normalizePhone(body.phone);
  const message = text(body.message, 'پیام', 2, 4000);
  const company = String(body.company || '').trim().slice(0, 120);
  const lead = await Lead.create({
    name,
    company,
    phone,
    stage: 'new',
    source: 'website',
    description: message,
  });
  const request = await ContactRequest.create({ name, company, phone, message, leadId: lead.id });
  await OutboundEmail.create({
    kind: 'contact',
    recipient: 'ops@alamut.local',
    subject: `درخواست تماس ${name}`,
    body: `${name} / ${phone}${company ? ` / ${company}` : ''}\n${message}`,
    status: 'pending',
  });
  await pushNotice({ title: 'درخواست تماس سایت', body: `${name} — ${phone}` });
  return { id: request.id, leadId: lead.id };
}

async function listContacts() {
  const rows = await ContactRequest.findAll({ order: [['createdAt', 'DESC']], limit: 100 });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    company: row.company || '',
    phone: row.phone,
    message: row.message,
    leadId: row.leadId,
    createdAt: row.createdAt,
  }));
}

async function listEmails(includeBody) {
  const rows = await OutboundEmail.findAll({ order: [['createdAt', 'DESC']], limit: 100 });
  return rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    recipient: row.recipient,
    subject: row.subject,
    body: includeBody ? row.body : '',
    status: row.status,
    error: row.error,
    createdAt: row.createdAt,
  }));
}

async function setEmailStatus(admin, id, status) {
  if (!['pending', 'sent', 'failed'].includes(status)) throw new AppError('وضعیت ایمیل نامعتبر است.', 400);
  const row = await OutboundEmail.findByPk(id);
  if (!row) throw new AppError('ایمیل پیدا نشد.', 404);
  row.status = status;
  await row.save();
  await audit(admin, 'email.status', 'email', row.id, { status });
  return { id: row.id, status: row.status };
}

async function controlRoom() {
  const today = new Date();
  const day = today.toISOString().slice(0, 10);
  const [moving, leads, incidents, followups, drivers, emailsPending, emailsFailed] = await Promise.all([
    Shipment.findAll({
      where: { workflow_status: { [Op.in]: ACTIVE_TRIP } },
      include: [{ model: Driver, as: 'driver' }, { model: City, as: 'originCity' }, { model: City, as: 'destCity' }],
    }),
    Lead.findAll({ attributes: ['stage'] }),
    Incident.count({ where: { status: { [Op.ne]: 'resolved' } } }),
    FollowUp.count({ where: { done: false, dueAt: { [Op.lt]: today } } }),
    Driver.findAll({
      attributes: ['id', 'firstName', 'lastName', 'dossierStatus', 'licenseExpiry', 'insuranceExpiry'],
    }),
    OutboundEmail.count({ where: { status: 'pending' } }),
    OutboundEmail.count({ where: { status: 'failed' } }),
  ]);
  const movingWithoutLocation = moving
    .filter((row) => !row.driver || row.driver.lastLat == null)
    .map((row) => ({
      id: row.id,
      trackingCode: row.tracking_code,
      origin: row.originCity?.name || '',
      destination: row.destCity?.name || '',
    }));
  const late = await Shipment.findAll({
    where: {
      loading_date: { [Op.lt]: day },
      workflow_status: { [Op.in]: [...PRE_DEPARTURE, 'AT_LOADING_INSPECTION'] },
    },
    attributes: ['id', 'tracking_code', 'loading_date', 'workflow_status'],
    limit: 50,
  });
  const pendingReview = await Shipment.count({ where: { workflow_status: { [Op.in]: ['REQUEST_REGISTERED', 'UNDER_REVIEW'] } } });
  const unassigned = await Shipment.count({
    where: { driver_id: null, workflow_status: { [Op.in]: ['CUSTOMER_CONFIRMED', 'DRIVER_ASSIGNMENT', 'PRICE_ESTIMATED'] } },
  });
  const stages = {};
  for (const stage of LEAD_STAGES) stages[stage] = 0;
  for (const lead of leads) stages[lead.stage] = (stages[lead.stage] || 0) + 1;
  const queue = drivers
    .filter((row) => ['submitted', 'rejected'].includes(row.dossierStatus))
    .slice(0, 100)
    .map((row) => ({
      id: row.id,
      name: [row.firstName, row.lastName].filter(Boolean).join(' '),
      status: row.dossierStatus,
    }));
  return {
    movingWithoutLocation,
    emailPending: emailsPending,
    emailFailed: emailsFailed,
    pendingDrivers: queue.filter((row) => row.status === 'submitted').length,
    rejectedDrivers: queue.filter((row) => row.status === 'rejected').length,
    expiredDrivers: drivers.filter((row) => documentsExpired(row, today)).length,
    pendingReview,
    unassigned,
    latePickups: late.map((row) => ({
      id: row.id,
      trackingCode: row.tracking_code,
      loadingDate: row.loading_date,
      status: WORKFLOW_LABELS[row.workflow_status] || row.workflow_status,
    })),
    openIncidents: incidents,
    overdueFollowups: followups,
    leadStages: stages,
    driverQueue: queue,
  };
}

async function teamDirectory(query = {}) {
  const q = String(query.q || '').trim();
  const like = q ? `%${q}%` : null;
  const role = query.role || 'all';
  const people = [];
  if (role === 'all' || role === 'driver') {
    const where = like ? {
      [Op.or]: [
        { firstName: { [Op.like]: like } },
        { lastName: { [Op.like]: like } },
        { phoneNumber: { [Op.like]: like } },
        { plate: { [Op.like]: like } },
      ],
    } : {};
    const drivers = await Driver.findAll({ where, limit: 80, order: [['updatedAt', 'DESC']] });
    for (const row of drivers) {
      people.push({
        id: row.id,
        role: 'driver',
        name: [row.firstName, row.lastName].filter(Boolean).join(' '),
        phone: row.phoneNumber,
        plate: row.plate || '',
        company: row.trailerType || '',
        accountVerified: row.accountVerified !== false,
        dossierStatus: row.dossierStatus,
        marketOpen: marketOpen(row),
      });
    }
  }
  if (role === 'all' || role === 'owner') {
    const owners = await User.findAll({
      where: { role: 'cargo_owner' },
      include: [CargoOwner],
      limit: 80,
      order: [['id', 'DESC']],
    });
    for (const row of owners) {
      const profile = row.CargoOwner;
      const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || row.phone_number;
      if (like && !`${name} ${row.phone_number} ${profile?.company_name || ''}`.includes(q)) continue;
      people.push({
        id: row.id,
        role: 'owner',
        name,
        phone: row.phone_number,
        plate: '',
        company: profile?.company_name || '',
        accountVerified: true,
        dossierStatus: profile?.verification_status || '',
        marketOpen: false,
      });
    }
  }
  if (role === 'all' || role === 'inspector') {
    const inspectors = await Inspector.findAll({ limit: 80, order: [['fullName', 'ASC']] });
    for (const row of inspectors) {
      if (like && !`${row.fullName} ${row.phone}`.includes(q)) continue;
      people.push({
        id: row.id,
        role: 'inspector',
        name: row.fullName,
        phone: row.phone,
        plate: '',
        company: '',
        accountVerified: row.isActive !== false,
        dossierStatus: row.isActive === false ? 'inactive' : 'active',
        marketOpen: false,
      });
    }
  }
  return people;
}

async function setAccountVerified(admin, driverId, verified) {
  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new AppError('راننده پیدا نشد.', 404);
  driver.accountVerified = Boolean(verified);
  await driver.save();
  await audit(admin, 'driver.account', 'driver', driver.id, { verified: driver.accountVerified });
  return { id: driver.id, accountVerified: driver.accountVerified, marketOpen: marketOpen(driver) };
}

async function reviewDossier(admin, driverId, body) {
  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new AppError('راننده پیدا نشد.', 404);
  const decision = body.decision === 'approved' ? 'approved' : body.decision === 'rejected' ? 'rejected' : null;
  if (!decision) throw new AppError('نتیجه بررسی نامعتبر است.', 400);
  const note = String(body.note || '').trim();
  if (decision === 'rejected' && note.length < 3) throw new AppError('دلیل برگشت پرونده را بنویسید.', 400);
  if (decision === 'approved' && !fleetReady(driver.fleetDocuments)) {
    throw new AppError('گواهینامه، کارت خودرو و بیمه‌نامه باید جداگانه تأیید شده باشند.', 400);
  }
  driver.dossierStatus = decision;
  driver.reviewNote = note;
  await driver.save();
  await audit(admin, 'driver.dossier', 'driver', driver.id, { decision });
  return {
    id: driver.id,
    dossierStatus: driver.dossierStatus,
    reviewNote: driver.reviewNote,
    marketOpen: marketOpen(driver),
    fleet: Object.values(readFleet(driver.fleetDocuments)),
  };
}

async function saveDriverProfile(admin, driverId, body) {
  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new AppError('راننده پیدا نشد.', 404);
  const fields = ['birthDate', 'licenseExpiry', 'insuranceExpiry', 'emergencyName', 'emergencyPhone', 'homeAddress'];
  for (const field of fields) {
    if (body[field] !== undefined) driver[field] = body[field] || null;
  }
  if (driver.emergencyPhone) driver.emergencyPhone = normalizePhone(driver.emergencyPhone);
  await driver.save();
  await audit(admin, 'driver.profile', 'driver', driver.id, {});
  return driver;
}

async function applyFleet(driver, next) {
  driver.fleetDocuments = next;
  driver.changed('fleetDocuments', true);
  await driver.save();
  return Object.values(readFleet(driver.fleetDocuments));
}

async function uploadFleet(driver, key, url) {
  return applyFleet(driver, upsertFleet(driver.fleetDocuments, { key, url }));
}

async function decideFleet(admin, driverId, body) {
  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new AppError('راننده پیدا نشد.', 404);
  let next;
  try {
    next = reviewFleet(driver.fleetDocuments, body);
  } catch (error) {
    throw new AppError(error.message, error.statusCode || 400);
  }
  const fleet = await applyFleet(driver, next);
  await audit(admin, 'driver.fleet', 'driver', driver.id, { key: body.key, decision: body.decision });
  return fleet;
}

async function catalog(query = {}) {
  const q = String(query.q || '').trim();
  const where = q ? { name: { [Op.like]: `%${q}%` } } : {};
  const cities = await City.findAll({ where, limit: q ? 30 : 40, order: [['name', 'ASC']] });
  const vehicles = await VehicleType.findAll({ where: { is_active: true }, order: [['title', 'ASC']] });
  return {
    cities: cities.map((city) => {
      const center = centerOf(city);
      return { id: city.id, name: city.name, province: city.province, lat: center?.lat || null, lng: center?.lng || null };
    }),
    vehicles: vehicles.map((row) => ({ id: row.id, title: row.title })),
  };
}

async function cityZones(cityId) {
  return Zone.findAll({ where: { city_id: cityId }, order: [['name', 'ASC']] });
}

async function placeOffer(driver, shipmentId, body) {
  if (!marketOpen(driver)) throw new AppError('بازار بار پس از تأیید پرونده و اعتبار مدارک باز می‌شود.', 403);
  const shipment = await Shipment.findByPk(shipmentId);
  if (!shipment || shipment.driver_id) throw new AppError('این بار پیشنهاد نمی‌پذیرد.', 400);
  const amount = Number(body.amount);
  if (!Number.isInteger(amount) || amount < 1000) throw new AppError('مبلغ پیشنهاد باید حداقل ۱۰۰۰ تومان باشد.', 400);
  const existing = await ShipmentOffer.findOne({ where: { shipmentId: shipment.id, driverId: driver.id, status: 'pending' } });
  if (existing) throw new AppError('پیشنهاد شما قبلاً ثبت شده است.', 400);
  const offer = await ShipmentOffer.create({
    shipmentId: shipment.id,
    driverId: driver.id,
    amount,
    note: String(body.note || '').trim().slice(0, 500),
  });
  await pushNotice({
    title: 'پیشنهاد کرایه',
    body: `راننده برای بار ${shipment.tracking_code} پیشنهاد ${amount.toLocaleString('fa-IR')} تومان ثبت کرد.`,
    shipmentId: shipment.id,
  });
  return { id: offer.id, amount: Number(offer.amount), status: offer.status };
}

module.exports = {
  pushNotice,
  listLeads,
  saveLead,
  addActivity,
  listFollowups,
  saveFollowup,
  toggleFollowup,
  listIncidents,
  saveIncident,
  updateIncident,
  openCritical,
  listInvoices,
  financeSummary,
  recordPayment,
  ensureInvoice,
  listTickets,
  saveTicket,
  replyTicket,
  closeTicket,
  listNotices,
  unreadNoticeCount,
  markNoticesRead,
  listArticles,
  saveArticle,
  publicArticle,
  ingestContact,
  listContacts,
  listEmails,
  setEmailStatus,
  controlRoom,
  teamDirectory,
  setAccountVerified,
  reviewDossier,
  saveDriverProfile,
  uploadFleet,
  decideFleet,
  readFleet,
  catalog,
  cityZones,
  placeOffer,
};
