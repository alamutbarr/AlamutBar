const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Lead = sequelize.define('Lead', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING(120), allowNull: false },
  company: { type: DataTypes.STRING(120), allowNull: true },
  phone: { type: DataTypes.STRING(15), allowNull: false },
  stage: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'new' },
  source: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'manual' },
  description: { type: DataTypes.TEXT, allowNull: true },
  assignedAdminId: { type: DataTypes.INTEGER, allowNull: true },
  createdByAdminId: { type: DataTypes.INTEGER, allowNull: true },
}, { tableName: 'crm_leads', underscored: true });

const CrmActivity = sequelize.define('CrmActivity', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  leadId: { type: DataTypes.INTEGER, allowNull: false },
  adminId: { type: DataTypes.INTEGER, allowNull: true },
  kind: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'note' },
  body: { type: DataTypes.TEXT, allowNull: false },
}, { tableName: 'crm_activities', underscored: true });

const FollowUp = sequelize.define('FollowUp', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  leadId: { type: DataTypes.INTEGER, allowNull: true },
  shipmentId: { type: DataTypes.INTEGER, allowNull: true },
  title: { type: DataTypes.STRING(180), allowNull: false },
  assignedAdminId: { type: DataTypes.INTEGER, allowNull: false },
  dueAt: { type: DataTypes.DATE, allowNull: false },
  done: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  completedAt: { type: DataTypes.DATE, allowNull: true },
  createdByAdminId: { type: DataTypes.INTEGER, allowNull: true },
}, { tableName: 'follow_ups', underscored: true });

const Incident = sequelize.define('Incident', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  shipmentId: { type: DataTypes.INTEGER, allowNull: false },
  adminId: { type: DataTypes.INTEGER, allowNull: true },
  kind: { type: DataTypes.STRING(20), allowNull: false },
  severity: { type: DataTypes.STRING(12), allowNull: false, defaultValue: 'normal' },
  description: { type: DataTypes.TEXT, allowNull: false },
  status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'open' },
  resolution: { type: DataTypes.TEXT, allowNull: true },
  resolvedByAdminId: { type: DataTypes.INTEGER, allowNull: true },
}, { tableName: 'incidents', underscored: true });

const Invoice = sequelize.define('Invoice', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  shipmentId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
  amount: { type: DataTypes.BIGINT, allowNull: false },
  status: { type: DataTypes.STRING(12), allowNull: false, defaultValue: 'unpaid' },
  reference: { type: DataTypes.STRING(100), allowNull: true },
  paidAt: { type: DataTypes.DATE, allowNull: true },
}, { tableName: 'invoices', underscored: true });

const InvoicePayment = sequelize.define('InvoicePayment', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  invoiceId: { type: DataTypes.INTEGER, allowNull: false },
  amount: { type: DataTypes.BIGINT, allowNull: false },
  reference: { type: DataTypes.STRING(100), allowNull: false },
  adminId: { type: DataTypes.INTEGER, allowNull: true },
}, { tableName: 'invoice_payments', underscored: true });

const SupportTicket = sequelize.define('SupportTicket', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  ownerId: { type: DataTypes.INTEGER, allowNull: true },
  driverId: { type: DataTypes.INTEGER, allowNull: true },
  phone: { type: DataTypes.STRING(15), allowNull: true },
  subject: { type: DataTypes.STRING(140), allowNull: false },
  priority: { type: DataTypes.STRING(12), allowNull: false, defaultValue: 'normal' },
  status: { type: DataTypes.STRING(12), allowNull: false, defaultValue: 'open' },
  createdByAdminId: { type: DataTypes.INTEGER, allowNull: true },
}, { tableName: 'support_tickets', underscored: true });

const SupportMessage = sequelize.define('SupportMessage', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  ticketId: { type: DataTypes.INTEGER, allowNull: false },
  authorRole: { type: DataTypes.STRING(20), allowNull: false },
  authorName: { type: DataTypes.STRING(80), allowNull: false },
  body: { type: DataTypes.TEXT, allowNull: false },
}, { tableName: 'support_ticket_messages', underscored: true });

const AdminNotification = sequelize.define('AdminNotification', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  adminId: { type: DataTypes.INTEGER, allowNull: true },
  title: { type: DataTypes.STRING(150), allowNull: false },
  body: { type: DataTypes.STRING(500), allowNull: false },
  shipmentId: { type: DataTypes.INTEGER, allowNull: true },
  isRead: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
}, { tableName: 'admin_notifications', underscored: true });

const Article = sequelize.define('Article', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  title: { type: DataTypes.STRING(180), allowNull: false },
  slug: { type: DataTypes.STRING(180), allowNull: false, unique: true },
  summary: { type: DataTypes.STRING(350), allowNull: false },
  body: { type: DataTypes.TEXT, allowNull: false },
  category: { type: DataTypes.STRING(60), allowNull: false, defaultValue: 'راهنمای حمل' },
  status: { type: DataTypes.STRING(12), allowNull: false, defaultValue: 'draft' },
  publishedAt: { type: DataTypes.DATE, allowNull: true },
  createdByAdminId: { type: DataTypes.INTEGER, allowNull: true },
}, { tableName: 'articles', underscored: true });

const ContactRequest = sequelize.define('ContactRequest', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING(120), allowNull: false },
  company: { type: DataTypes.STRING(120), allowNull: true },
  phone: { type: DataTypes.STRING(15), allowNull: false },
  message: { type: DataTypes.TEXT, allowNull: false },
  leadId: { type: DataTypes.INTEGER, allowNull: true },
}, { tableName: 'contact_requests', underscored: true });

const ShipmentDocument = sequelize.define('ShipmentDocument', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  shipmentId: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING(180), allowNull: false },
  url: { type: DataTypes.STRING(255), allowNull: false },
  adminId: { type: DataTypes.INTEGER, allowNull: true },
}, { tableName: 'shipment_documents', underscored: true });

const ShipmentOffer = sequelize.define('ShipmentOffer', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  shipmentId: { type: DataTypes.INTEGER, allowNull: false },
  driverId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  amount: { type: DataTypes.BIGINT, allowNull: false },
  note: { type: DataTypes.STRING(500), allowNull: true },
  status: { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'pending' },
}, { tableName: 'shipment_offers', underscored: true });

const OutboundEmail = sequelize.define('OutboundEmail', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  kind: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'contact' },
  recipient: { type: DataTypes.STRING(180), allowNull: false },
  subject: { type: DataTypes.STRING(180), allowNull: false },
  body: { type: DataTypes.TEXT, allowNull: false },
  status: { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'pending' },
  error: { type: DataTypes.STRING(300), allowNull: true },
}, { tableName: 'outbound_emails', underscored: true });

module.exports = {
  Lead,
  CrmActivity,
  FollowUp,
  Incident,
  Invoice,
  InvoicePayment,
  SupportTicket,
  SupportMessage,
  AdminNotification,
  Article,
  ContactRequest,
  ShipmentDocument,
  ShipmentOffer,
  OutboundEmail,
};
