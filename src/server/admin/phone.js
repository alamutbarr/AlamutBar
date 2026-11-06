const AppError = require('../utils/AppError');

function normalizePhone(input) {
  const digits = String(input || '')
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/\D/g, '');
  let phone = digits;
  if (phone.startsWith('98') && phone.length === 12) phone = `0${phone.slice(2)}`;
  if (phone.startsWith('9') && phone.length === 10) phone = `0${phone}`;
  if (!/^09\d{9}$/.test(phone)) {
    throw new AppError('شماره موبایل معتبر نیست.', 400);
  }
  return phone;
}

function faNumber(value) {
  if (value == null || value === '') return '—';
  return Number(value).toLocaleString('fa-IR');
}

module.exports = { normalizePhone, faNumber };
