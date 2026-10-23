const AppError = require('../utils/AppError');
const smsService = require('./sms.service');

const OTP_TTL_MINUTES = 5;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_VERIFY_ATTEMPTS = 5;

function generateOtp() {
  return String(Math.floor(10000 + Math.random() * 90000)); // کد ۵ رقمی
}

async function sendOtpSms(phoneNumber, code) {
  return smsService.sendOtpSms(phoneNumber, code);
}

function getOtpExpiry() {
  return new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
}

// جلوگیری از درخواست‌های پی‌درپی کد تأیید (حداقل فاصله بین دو درخواست)
function assertCanResend(user) {
  if (!user.otp_last_sent_at) return;
  const secondsSinceLast = (Date.now() - new Date(user.otp_last_sent_at).getTime()) / 1000;
  if (secondsSinceLast < RESEND_COOLDOWN_SECONDS) {
    const wait = Math.ceil(RESEND_COOLDOWN_SECONDS - secondsSinceLast);
    throw new AppError(`لطفاً ${wait} ثانیه‌ی دیگر دوباره تلاش کنید.`, 429);
  }
}

function verifyOtpMatch(user, submittedCode) {
  if (!user.otp_code || !user.otp_expires_at) {
    throw new AppError('ابتدا درخواست کد تأیید بدهید.', 400);
  }
  if (new Date() > new Date(user.otp_expires_at)) {
    throw new AppError('کد تأیید منقضی شده است. دوباره درخواست دهید.', 400);
  }
  if (user.otp_attempts >= MAX_VERIFY_ATTEMPTS) {
    throw new AppError('تعداد تلاش‌های مجاز برای این کد به پایان رسید. یک کد جدید درخواست دهید.', 429);
  }
  if (user.otp_code !== submittedCode) {
    const err = new AppError('کد تأیید نادرست است.', 400);
    err.isWrongOtp = true;
    throw err;
  }
  return true;
}

module.exports = {
  generateOtp,
  sendOtpSms,
  getOtpExpiry,
  assertCanResend,
  verifyOtpMatch,
  MAX_VERIFY_ATTEMPTS,
};
