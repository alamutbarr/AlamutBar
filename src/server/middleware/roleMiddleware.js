// محدودسازی دسترسی بر اساس نقش کاربر - برای جداسازی مسیرهای صاحب کالا از اپراتور/راننده و ...
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'شما اجازه‌ی دسترسی به این بخش را ندارید.' });
  }
  next();
};

module.exports = requireRole;
