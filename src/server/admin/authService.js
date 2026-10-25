const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Admin } = require('../models');
const AppError = require('../utils/AppError');
const { ROLES, ROLE_LABELS, listPermissions, parseRoles } = require('./permissions');

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
  return {
    id: admin.id,
    phone: admin.phone,
    username: admin.username,
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

async function issueSession(admin) {
  admin.lastLoginAt = new Date();
  await admin.save();
  return {
    token: signAccess(admin),
    refreshToken: await signRefresh(admin),
    admin: presentAdmin(admin),
  };
}

async function loginWithPassword(usernameInput, password) {
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
  return issueSession(admin);
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
  refresh,
  logout,
  assertRoles,
};
