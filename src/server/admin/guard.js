const jwt = require('jsonwebtoken');
const { Admin } = require('../models');
const { can } = require('./permissions');

async function requireAdmin(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token) return res.status(401).json({ success: false, message: 'لطفاً وارد شوید.' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.kind !== 'admin' || decoded.typ !== 'access') {
      return res.status(401).json({ success: false, message: 'نشست نامعتبر است.' });
    }
    const admin = await Admin.findByPk(decoded.id);
    if (!admin || !admin.isActive) {
      return res.status(403).json({ success: false, message: 'حساب اپراتور غیرفعال است.' });
    }
    req.admin = admin;
    req.adminRoles = admin.roles || [];
    return next();
  } catch {
    return res.status(401).json({ success: false, message: 'نشست منقضی شده است. دوباره وارد شوید.' });
  }
}

function requirePermission(permission) {
  return (req, res, next) => {
    if (!can(req.adminRoles, permission)) {
      return res.status(403).json({ success: false, message: 'به این بخش دسترسی ندارید.' });
    }
    return next();
  };
}

module.exports = { requireAdmin, requirePermission };
