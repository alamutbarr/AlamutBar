const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { Admin } = require('../models');
const AppError = require('../utils/AppError');
const otpService = require('../services/otp.service');
const { ROLES, ROLE_LABELS, listPermissions } = require('./permissions');
const { normalizePhone } = require('./phone');

const DEV_ADMIN_OTP = process.env.ADMIN_DEV_OTP || '12345';

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function presentAdmin(admin) {
  let roles = admin.roles;
  if (typeof roles === 'string') {
    try { roles = JSON.parse(roles); } catch { roles = []; }
  }
  if (!Array.isArray(roles)) roles = [];
  return {
    id: admin.id,
    phone: admin.phone,
    fullName: admin.fullName,
    roles,
    roleLabels: roles.map((role) => ROLE_LABELS[role] || role),
    permissions: listPermissions(roles),
    isActive: admin.isActive,
    lastLoginAt: admin.lastLoginAt,
    createdAt: admin.createdAt,
  };
}

function signAccess(admin) {
  return jwt.sign(
    { id: admin.id, kind: 'admin', typ: 'access', role: 'admin' },
    process.env.JWT_SECRET,
    { expiresIn: '8h' },
  );
}

async function signRefresh(admin) {
  const refreshToken = jwt.sign(
    { id: admin.id, kind: 'admin', typ: 'refresh' },
    process.env.JWT_SECRET,
    { expiresIn: '30d' },
  );
  admin.refreshTokenHash = hashToken(refreshToken);
  await admin.save();
  return refreshToken;
}

async function requestOtp(phoneInput) {
  const phone = normalizePhone(phoneInput);
  const admin = await Admin.findOne({ where: { phone } });
  if (!admin || !admin.isActive) {
    throw new AppError('این شماره در فهرست اپراتورهای فعال نیست.', 404);
  }
  otpService.assertCanResend({ otp_last_sent_at: admin.otpLastSentAt });
  const realSms = process.env.SMS_PROVIDER === 'kavenegar' && process.env.SMS_API_KEY;
  const code = realSms ? otpService.generateOtp() : DEV_ADMIN_OTP;
  const sms = await otpService.sendOtpSms(phone, code);
  admin.otpCode = code;
  admin.otpExpiresAt = otpService.getOtpExpiry();
  admin.otpLastSentAt = new Date();
  admin.otpAttempts = 0;
  await admin.save();
  return { phone, devOtpCode: sms.mocked ? code : undefined };
}

async function verifyOtp(phoneInput, code) {
  const phone = normalizePhone(phoneInput);
  const admin = await Admin.findOne({ where: { phone } });
  if (!admin || !admin.isActive) {
    throw new AppError('این شماره در فهرست اپراتورهای فعال نیست.', 404);
  }
  const probe = {
    otp_code: admin.otpCode,
    otp_expires_at: admin.otpExpiresAt,
    otp_attempts: admin.otpAttempts,
  };
  try {
    otpService.verifyOtpMatch(probe, String(code || '').trim());
  } catch (error) {
    if (error.isWrongOtp) {
      admin.otpAttempts += 1;
      await admin.save();
    }
    throw error;
  }
  admin.otpCode = null;
  admin.otpExpiresAt = null;
  admin.otpAttempts = 0;
  admin.lastLoginAt = new Date();
  await admin.save();
  return {
    token: signAccess(admin),
    refreshToken: await signRefresh(admin),
    admin: presentAdmin(admin),
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
  if (decoded.kind !== 'admin' || decoded.typ !== 'refresh') {
    throw new AppError('نشست تمدید نامعتبر است.', 401);
  }
  const admin = await Admin.findByPk(decoded.id);
  if (!admin || !admin.isActive || admin.refreshTokenHash !== hashToken(refreshToken)) {
    throw new AppError('نشست تمدید نامعتبر است.', 401);
  }
  return {
    token: signAccess(admin),
    refreshToken: await signRefresh(admin),
    admin: presentAdmin(admin),
  };
}

async function logout(admin) {
  admin.refreshTokenHash = null;
  await admin.save();
}

function assertRoles(roles) {
  if (!Array.isArray(roles) || roles.length === 0 || roles.some((role) => !ROLES.includes(role))) {
    throw new AppError('حداقل یک نقش معتبر انتخاب کنید.', 400);
  }
  return [...new Set(roles)];
}

module.exports = {
  DEV_ADMIN_OTP,
  presentAdmin,
  requestOtp,
  verifyOtp,
  refresh,
  logout,
  assertRoles,
};
