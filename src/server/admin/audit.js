const { AdminAuditLog, OrderEvent } = require('../models');

async function audit(admin, action, entity, entityId, details) {
  await AdminAuditLog.create({
    action,
    entity,
    entityId: entityId == null ? null : String(entityId),
    performedBy: admin?.id || null,
    details: details || null,
  });
}

async function logEvent(shipmentId, {
  type,
  description,
  adminId = null,
  metadata = null,
  lat = null,
  lng = null,
}) {
  return OrderEvent.create({
    shipmentId,
    eventType: type,
    description,
    performedByAdminId: adminId,
    metadata,
    lat,
    lng,
  });
}

function pageOf(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 20));
  return { page, limit, offset: (page - 1) * limit };
}

module.exports = { audit, logEvent, pageOf };
