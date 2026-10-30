const REVEALED_DRIVER = ['WaybillIssued', 'InTransit', 'NearDestination', 'Completed'];
const REVEALED_WORKFLOW = ['WAYBILL_ISSUED', 'IN_TRANSIT', 'AT_DESTINATION_UNLOADING', 'COMPLETED'];
const REVEALED_LEGACY = ['in_transit', 'delivered', 'completed'];

function canRevealExactDestination({ driverStatus, legacyStatus, workflowStatus } = {}) {
  if (REVEALED_DRIVER.includes(driverStatus)) return true;
  if (REVEALED_WORKFLOW.includes(workflowStatus)) return true;
  if (REVEALED_LEGACY.includes(legacyStatus)) return true;
  return false;
}

function assertDeliveryOtp({ expected, provided, exceptionReason } = {}) {
  if (!expected) return { ok: true, method: 'not_required' };
  if (provided != null && String(provided).trim() === String(expected).trim()) {
    return { ok: true, method: 'otp' };
  }
  const reason = String(exceptionReason || '').trim();
  if (reason.length >= 3) return { ok: true, method: 'exception' };
  return { ok: false, error: 'کد تحویل نادرست است. در صورت نبودن کد، دلیل را ثبت کنید.' };
}

module.exports = { canRevealExactDestination, assertDeliveryOtp };
