function generateWaybillSmsCode() {
  return String(Math.floor(10000 + Math.random() * 90000));
}

function waybillSmsMatches(stored, provided) {
  return String(stored || '').trim() !== '' && String(stored).trim() === String(provided || '').trim();
}

function driverMayStartTransit(shipment = {}) {
  return Boolean(shipment.waybill_code_verified && shipment.waybill_photo_url);
}

function waybillForDriver(shipment = {}) {
  return {
    smsSent: Boolean(shipment.waybill_sms_code),
    codeVerified: Boolean(shipment.waybill_code_verified),
    photoUrl: shipment.waybill_photo_url || null,
  };
}

function waybillForOperator(shipment = {}) {
  return {
    ...waybillForDriver(shipment),
    smsCode: shipment.waybill_sms_code || null,
    number: shipment.waybill_number || null,
  };
}

module.exports = {
  generateWaybillSmsCode,
  waybillSmsMatches,
  driverMayStartTransit,
  waybillForDriver,
  waybillForOperator,
};
