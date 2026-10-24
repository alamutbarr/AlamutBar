const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { Inspector } = require('../models');
const AppError = require('../utils/AppError');
const otpService = require('../services/otp.service');
const { normalizePhone } = require('../admin/phone');

const DEV_INSPECTOR_OTP = process.env.INSPECTOR_DEV_OTP || '12345';

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function presentInspector(inspector) {
  return {
    id: inspector.id,
    phone: inspector.phone,
    fullName: inspector.fullName,
    isActive: inspector.isActive,
    lastLoginAt: inspector.lastLoginAt,
  };
}

function signAccess(inspector) {
  return jwt.sign(
    { id: inspector.id, kind: 'inspector', typ: 'access', role: 'inspector' },
    process.env.JWT_SECRET,
    { expiresIn: '12h' },
  );
}

async function signRefresh(inspector) {
  const refreshToken = jwt.sign(
    { id: inspector.id, kind: 'inspector', typ: 'refresh' },
    process.env.JWT_SECRET,
    { expiresIn: '30d' },
  );
  inspector.refreshTokenHash = hashToken(refreshToken);
  await inspector.save();
  return refreshToken;
}

async function requestOtp(phoneInput) {
  const phone = normalizePhone(phoneInput);
  const inspector = await Inspector.findOne({ where: { phone } });
  if (!inspector || !inspector.isActive) {
    throw new AppError('این شماره در فهرست متصدیان فعال نیست.', 404);
  }
  otpService.assertCanResend({ otp_last_sent_at: inspector.otpLastSentAt });
  const realSms = process.env.SMS_PROVIDER === 'kavenegar' && process.env.SMS_API_KEY;
  const code = realSms ? otpService.generateOtp() : DEV_INSPECTOR_OTP;
  const sms = await otpService.sendOtpSms(phone, code);
  inspector.otpCode = code;
  inspector.otpExpiresAt = otpService.getOtpExpiry();
  inspector.otpLastSentAt = new Date();
  inspector.otpAttempts = 0;
  await inspector.save();
  return { phone, devOtpCode: sms.mocked ? code : undefined };
}

async function verifyOtp(phoneInput, code) {
  const phone = normalizePhone(phoneInput);
  const inspector = await Inspector.findOne({ where: { phone } });
  if (!inspector || !inspector.isActive) {
    throw new AppError('این شماره در فهرست متصدیان فعال نیست.', 404);
  }
  const probe = {
    otp_code: inspector.otpCode,
    otp_expires_at: inspector.otpExpiresAt,
    otp_attempts: inspector.otpAttempts,
  };
  try {
    otpService.verifyOtpMatch(probe, String(code || '').trim());
  } catch (error) {
    if (error.isWrongOtp) {
      inspector.otpAttempts += 1;
      await inspector.save();
    }
    throw error;
  }
  inspector.otpCode = null;
  inspector.otpExpiresAt = null;
  inspector.otpAttempts = 0;
  inspector.lastLoginAt = new Date();
  await inspector.save();
  return {
    token: signAccess(inspector),
    refreshToken: await signRefresh(inspector),
    inspector: presentInspector(inspector),
  };
}

async function refresh(refreshToken) {
  if (!refreshToken) throw new AppError('نشست تمدید نشد.', 401);
  let decoded;
  try {
    decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
  } catch {
    throw new AppError('نشست تمدید منقضی شده است.', 401);
  }
  if (decoded.kind !== 'inspector' || decoded.typ !== 'refresh') {
    throw new AppError('نشست تمدید نامعتبر است.', 401);
  }
  const inspector = await Inspector.findByPk(decoded.id);
  if (!inspector || !inspector.isActive || inspector.refreshTokenHash !== hashToken(refreshToken)) {
    throw new AppError('نشست تمدید نامعتبر است.', 401);
  }
  return {
    token: signAccess(inspector),
    refreshToken: await signRefresh(inspector),
    inspector: presentInspector(inspector),
  };
}

async function logout(inspector) {
  inspector.refreshTokenHash = null;
  await inspector.save();
}

module.exports = {
  DEV_INSPECTOR_OTP,
  presentInspector,
  requestOtp,
  verifyOtp,
  refresh,
  logout,
};
