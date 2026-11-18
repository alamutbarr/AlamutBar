const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Admin } = require('../models');
const AppError = require('../utils/AppError');
const { ROLES, ROLE_LABELS, listPermissions, parseRoles } = require('./permissions');
const avatarStore = require('../utils/avatarStore');
const { generateSecret, verifyTotp } = require('./totp');
const { OutboundEmail } = require('../models');

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function normalizeUsername(input) {
  const username = String(input || '').trim().toLowerCase();
  if (!/^[a-z][a-z0-9_]{2,31}$/.test(username)) {
    throw new AppError('نام کاربری باید با حرف انگلیسی شروع شود و ۳ تا ۳۲ نویسه باشد.', 400);
  }
  return username;
}

function hashPassword(password) {
  return bcrypt.hash(String(password), 10);
}

function checkPassword(password, passwordHash) {
  if (!passwordHash || password == null || String(password) === '') return Promise.resolve(false);
  return bcrypt.compare(String(password), passwordHash);
}

function presentAdmin(admin) {
  const roles = parseRoles(admin.roles);
  const names = avatarStore.splitName(admin.fullName);
  return {
    id: admin.id,
    phone: admin.phone,
    username: admin.username,
    fullName: admin.fullName,
    firstName: names.firstName,
    lastName: names.lastName,
    avatarUrl: avatarStore.publicUrl('admin', admin.id),
    roles,
    roleLabels: roles.map((role) => ROLE_LABELS[role] || role),
    permissions: listPermissions(roles),
    isActive: admin.isActive,
    lastLoginAt: admin.lastLoginAt,
    createdAt: admin.createdAt,
    email: admin.email || '',
    company: admin.company || '',
    nationalId: admin.nationalId || '',
    postalCode: admin.postalCode || '',
    mfaEnabled: Boolean(admin.mfaEnabled),
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

async function issueSession(admin) {
  admin.lastLoginAt = new Date();
  await admin.save();
  return {
    token: signAccess(admin),
    refreshToken: await signRefresh(admin),
    admin: presentAdmin(admin),
  };
}

async function findByPassword(usernameInput, password) {
  let username;
  try {
    username = normalizeUsername(usernameInput);
  } catch {
    throw new AppError('نام کاربری یا رمز عبور نادرست است.', 401);
  }
  const admin = await Admin.findOne({ where: { username } });
  const matches = admin ? await checkPassword(password, admin.passwordHash) : false;
  if (!admin || !admin.isActive || !matches) {
    throw new AppError('نام کاربری یا رمز عبور نادرست است.', 401);
  }
  return admin;
}

async function loginWithPassword(usernameInput, password, code) {
  const admin = await findByPassword(usernameInput, password);
  if (admin.mfaEnabled) {
    if (!code) {
      const ticket = jwt.sign({ id: admin.id, kind: 'admin', typ: 'mfa' }, process.env.JWT_SECRET, { expiresIn: '5m' });
      return { mfaRequired: true, ticket };
    }
    if (!verifyTotp(admin.mfaSecret, code)) throw new AppError('کد دومرحله‌ای نادرست است.', 401);
  }
  return issueSession(admin);
}

async function confirmMfa(ticket, code) {
  let decoded;
  try {
    decoded = jwt.verify(ticket, process.env.JWT_SECRET);
  } catch {
    throw new AppError('مهلت ورود دومرحله‌ای تمام شد. دوباره وارد شوید.', 401);
  }
  if (decoded.typ !== 'mfa' || decoded.kind !== 'admin') throw new AppError('درخواست ورود نامعتبر است.', 401);
  const admin = await Admin.findByPk(decoded.id);
  if (!admin || !admin.isActive || !admin.mfaEnabled) throw new AppError('ورود دومرحله‌ای فعال نیست.', 401);
  if (!verifyTotp(admin.mfaSecret, code)) throw new AppError('کد دومرحله‌ای نادرست است.', 401);
  return issueSession(admin);
}

async function updateProfile(admin, body) {
  const fullName = String(body.fullName || '').trim();
  if (fullName.length < 3 || fullName.length > 80) throw new AppError('نام و نام خانوادگی را کامل بنویسید.', 400);
  const email = String(body.email || '').trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AppError('ایمیل معتبر نیست.', 400);
  const nationalId = String(body.nationalId || '').trim();
  if (nationalId && !/^\d{10}$/.test(nationalId)) throw new AppError('کد ملی باید ۱۰ رقم باشد.', 400);
  const postalCode = String(body.postalCode || '').trim();
  if (postalCode && !/^\d{10}$/.test(postalCode)) throw new AppError('کد پستی باید ۱۰ رقم باشد.', 400);
  admin.fullName = fullName;
  admin.email = email || null;
  admin.company = String(body.company || '').trim().slice(0, 120) || null;
  admin.nationalId = nationalId || null;
  admin.postalCode = postalCode || null;
  if (body.phone) {
    const { normalizePhone } = require('./phone');
    admin.phone = normalizePhone(body.phone);
  }
  await admin.save();
  return presentAdmin(admin);
}

async function changePassword(admin, body) {
  const matches = await checkPassword(body.currentPassword, admin.passwordHash);
  if (!matches) throw new AppError('رمز فعلی نادرست است.', 400);
  const next = String(body.nextPassword || '');
  if (next.length < 8) throw new AppError('رمز جدید باید حداقل ۸ نویسه باشد.', 400);
  admin.passwordHash = await hashPassword(next);
  await admin.save();
}

async function beginMfa(admin) {
  admin.mfaSecret = generateSecret();
  admin.mfaEnabled = false;
  await admin.save();
  return { secret: admin.mfaSecret, otpauth: `otpauth://totp/Alamut:${admin.username}?secret=${admin.mfaSecret}&issuer=Alamut` };
}

async function enableMfa(admin, code) {
  if (!admin.mfaSecret) throw new AppError('اول فعال‌سازی را شروع کنید.', 400);
  if (!verifyTotp(admin.mfaSecret, code)) throw new AppError('کد ۶ رقمی برنامه نادرست است.', 400);
  admin.mfaEnabled = true;
  await admin.save();
  return presentAdmin(admin);
}

async function disableMfa(admin, body) {
  const matches = await checkPassword(body.currentPassword, admin.passwordHash);
  if (!matches || !verifyTotp(admin.mfaSecret, body.code)) {
    throw new AppError('رمز فعلی یا کد دومرحله‌ای نادرست است.', 400);
  }
  admin.mfaEnabled = false;
  admin.mfaSecret = null;
  await admin.save();
  return presentAdmin(admin);
}

async function startRecovery(usernameInput) {
  let username;
  try { username = normalizeUsername(usernameInput); } catch { return { sent: true }; }
  const admin = await Admin.findOne({ where: { username } });
  if (!admin || !admin.email) return { sent: true };
  const code = String(Math.floor(100000 + Math.random() * 900000));
  admin.otpCode = code;
  admin.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await admin.save();
  await OutboundEmail.create({
    kind: 'recovery',
    recipient: admin.email,
    subject: 'بازیابی ورود مرکز عملیات',
    body: `کد بازیابی ${admin.username}: ${code}`,
    status: 'pending',
  });
  return { sent: true, devCode: process.env.NODE_ENV === 'production' ? undefined : code };
}

async function confirmRecovery(body) {
  let username;
  try { username = normalizeUsername(body.username); } catch { throw new AppError('کد بازیابی نادرست است.', 400); }
  const admin = await Admin.findOne({ where: { username } });
  const next = String(body.password || '');
  if (!admin || !admin.otpCode || admin.otpCode !== String(body.code || '').trim() || !admin.otpExpiresAt || admin.otpExpiresAt < new Date()) {
    throw new AppError('کد بازیابی نادرست یا منقضی است.', 400);
  }
  if (next.length < 8) throw new AppError('رمز جدید باید حداقل ۸ نویسه باشد.', 400);
  admin.passwordHash = await hashPassword(next);
  admin.otpCode = null;
  admin.otpExpiresAt = null;
  await admin.save();
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
  presentAdmin,
  normalizeUsername,
  hashPassword,
  checkPassword,
  loginWithPassword,
  confirmMfa,
  updateProfile,
  changePassword,
  beginMfa,
  enableMfa,
  disableMfa,
  startRecovery,
  confirmRecovery,
  refresh,
  logout,
  assertRoles,
};
