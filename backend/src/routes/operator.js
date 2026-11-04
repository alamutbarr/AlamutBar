// backend/src/routes/operator.js
//
// مسیرهای پنل اپراتور برای بررسی مدارک احراز هویت رانندگان:
//   - POST /api/operator/login                      -> ورود اپراتور (نقش operator)
//   - GET  /api/operator/drivers                    -> فهرست رانندگان + وضعیت مدارک
//   - GET  /api/operator/drivers/:id/verification   -> مدارک و وضعیت یک راننده
//   - POST /api/operator/drivers/:id/verification/review -> تأیید/رد مدارک

const express = require('express');
const jwt = require('jsonwebtoken');
const { Driver, DriverDocument } = require('../models');
const JWT_SECRET = require('../config/jwt');
const {
  tractorLabel,
  trailerLabel,
  buildDocumentSections,
} = require('../utils/driverLabels');

const router = express.Router();

// اعتبارنامه‌ی اپراتور از متغیرهای محیطی خوانده می‌شود (برای MVP).
const OPERATOR_PHONE = process.env.OPERATOR_PHONE || 'operator';
const OPERATOR_PASSWORD = process.env.OPERATOR_PASSWORD || 'operator123';

function signOperatorToken() {
  return jwt.sign({ id: 0, role: 'operator' }, JWT_SECRET, { expiresIn: '7d' });
}

// میدلور بررسی نقش اپراتور/مدیر
function requireOperator(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ message: 'لطفاً وارد شوید.' });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (!['operator', 'admin'].includes(payload.role)) {
      return res.status(403).json({ message: 'دسترسی غیرمجاز.' });
    }
    req.user = { id: payload.id, role: payload.role };
    return next();
  } catch {
    return res.status(401).json({ message: 'نشست شما منقضی شده است. دوباره وارد شوید.' });
  }
}

function toOperatorDriverDto(row) {
  const d = row.toJSON ? row.toJSON() : row;
  const name = [d.firstName, d.lastName].filter(Boolean).join(' ').trim();
  return {
    id: d.id,
    name: name || 'راننده',
    phoneNumber: d.phoneNumber,
    nationalId: d.nationalId || '',
    licenseNumber: d.licenseNumber || '',
    plate: d.plate || '',
    // کد خام + برچسب فارسی، تا پنل اپراتور همیشه متن فارسی نشان دهد.
    tractorType: d.tractorType || '',
    tractorTypeLabel: tractorLabel(d.tractorType),
    trailerType: d.trailerType || '',
    trailerTypeLabel: trailerLabel(d.trailerType),
    verificationStatus: d.verificationStatus || 'pending',
    verificationNote: d.verificationNote || null,
    documentCount: d.documents ? d.documents.length : 0,
    joinedDate: d.createdAt ? new Date(d.createdAt).toLocaleDateString('fa-IR') : '',
  };
}

// POST /api/operator/login
router.post('/login', (req, res) => {
  const { phoneNumber, password } = req.body || {};
  if (phoneNumber !== OPERATOR_PHONE || password !== OPERATOR_PASSWORD) {
    return res.status(401).json({ message: 'نام کاربری یا رمز عبور اشتباه است.' });
  }
  return res.json({ token: signOperatorToken(), role: 'operator' });
});

// GET /api/operator/drivers
router.get('/drivers', requireOperator, async (req, res) => {
  try {
    const rows = await Driver.findAll({
      include: [{ model: DriverDocument, as: 'documents', attributes: ['id'] }],
      order: [['createdAt', 'DESC']],
    });
    return res.json({ drivers: rows.map(toOperatorDriverDto) });
  } catch (error) {
    console.error('Operator Drivers Error:', error);
    return res.status(500).json({ error: 'خطای سرور در دریافت فهرست رانندگان.' });
  }
});

// GET /api/operator/drivers/:id/verification
router.get('/drivers/:id/verification', requireOperator, async (req, res) => {
  try {
    const driver = await Driver.findByPk(req.params.id);
    if (!driver) {
      return res.status(404).json({ error: 'راننده پیدا نشد.' });
    }

    const docs = await DriverDocument.findAll({ where: { driverId: driver.id } });

    // نسخه‌ی خام (بخش -> جایگاه -> عکس) برای سازگاری
    const documents = {};
    for (const doc of docs) {
      documents[doc.section] = documents[doc.section] || {};
      documents[doc.section][doc.slot] = doc.imageData;
    }

    return res.json({
      driver: toOperatorDriverDto({ ...driver.toJSON(), documents: docs }),
      // ساختار مرتب و فارسی: هر بخش با عنوان خودش و هر عکس با برچسب جایگاه خودش
      sections: buildDocumentSections(docs),
      documents,
      verificationStatus: driver.verificationStatus || 'pending',
      verificationNote: driver.verificationNote || null,
    });
  } catch (error) {
    console.error('Operator Driver Verification Error:', error);
    return res.status(500).json({ error: 'خطای سرور در دریافت مدارک راننده.' });
  }
});

// POST /api/operator/drivers/:id/verification/review
// بدنه: { status: 'approved' | 'rejected', note?: string }
router.post('/drivers/:id/verification/review', requireOperator, async (req, res) => {
  try {
    const { status, note } = req.body || {};
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'وضعیت بررسی نامعتبر است.' });
    }

    const driver = await Driver.findByPk(req.params.id);
    if (!driver) {
      return res.status(404).json({ error: 'راننده پیدا نشد.' });
    }

    await driver.update({
      verificationStatus: status,
      verificationNote: typeof note === 'string' ? note : null,
    });

    return res.json({
      message: status === 'approved' ? 'مدارک تأیید شد.' : 'مدارک رد شد.',
      verificationStatus: status,
    });
  } catch (error) {
    console.error('Operator Review Error:', error);
    return res.status(500).json({ error: 'خطای سرور در ثبت نتیجه بررسی.' });
  }
});

module.exports = router;
