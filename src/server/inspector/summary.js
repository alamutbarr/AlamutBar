const { InspectionReport, Inspector } = require('../models');

function presentInspection(report) {
  if (!report) return null;
  return {
    decision: report.decision,
    decisionNote: report.decisionNote || null,
    inspectorName: report.inspector?.fullName || null,
  };
}

async function latestInspections(shipmentIds) {
  const ids = [...new Set((shipmentIds || []).filter((id) => id != null))];
  const found = new Map();
  if (!ids.length) return found;
  const reports = await InspectionReport.findAll({
    where: { shipmentId: ids },
    include: [{ model: Inspector, as: 'inspector', attributes: ['fullName'] }],
    order: [['id', 'DESC']],
  });
  for (const report of reports) {
    if (!found.has(report.shipmentId)) found.set(report.shipmentId, presentInspection(report));
  }
  return found;
}

async function attachInspectionSummaries(shipments) {
  const list = (Array.isArray(shipments) ? shipments : [shipments]).filter(Boolean);
  const found = await latestInspections(list.map((item) => item.id));
  for (const shipment of list) {
    shipment.setDataValue('inspection', found.get(shipment.id) || null);
  }
  return shipments;
}

module.exports = { presentInspection, latestInspections, attachInspectionSummaries };
