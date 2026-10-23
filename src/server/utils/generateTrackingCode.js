// تولید کد پیگیری یکتا با فرمت مشخص‌شده در فلوچارت: XB-1405-XXXXXX
function generateTrackingCode() {
  const persianYear = 1405; // TODO: در آینده از تبدیل تاریخ شمسی واقعی استفاده شود
  const randomPart = Math.floor(100000 + Math.random() * 900000);
  return `XB-${persianYear}-${randomPart}`;
}

module.exports = generateTrackingCode;
