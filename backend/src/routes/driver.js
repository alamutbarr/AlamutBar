const express = require('express');
const { authMiddleware } = require('../middleware/auth');
// IMPORTANT: exact file-name casing (Driver.js). '../models/driver' breaks on Linux/macOS
// and can load the model twice on Windows.
const Driver = require('../models/Driver');

const router = express.Router();

// Convert the DB row (first_name, last_name, national_id, ...) into the shape the
// React panel reads (name, mobile, nationalCode, licenseNumber, rating, ...).
function toPanelDriver(row) {
  const d = row.toJSON ? row.toJSON() : row;
  const name = [d.first_name, d.last_name].filter(Boolean).join(' ').trim();
  return {
    id: d.id,
    name: name || 'راننده',                 // DriverDashboard does driver.name.split(' ') -> must be a string
    mobile: d.phone_number,
    phone_number: d.phone_number,
    nationalCode: d.national_id || '',
    licenseNumber: d.license_number || '',
    companyName: d.company_name || null,
    verifiedStatus: 'pending',               // new accounts wait for document verification
    rating: 5.0,                             // avoid NaN in Intl.NumberFormat until real ratings exist
    totalMissions: 0,
    joinedDate: d.createdAt
      ? new Date(d.createdAt).toLocaleDateString('fa-IR')
      : '',
    sessionPolicy: 'persistent',
  };
}

// GET /api/driver/profile
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const driver = await Driver.findByPk(req.user.id);

    if (!driver) {
      // Token is valid but the account no longer exists -> frontend logs out on 401
      return res.status(401).json({ message: 'کاربر یافت نشد' });
    }

    return res.json({ driver: toPanelDriver(driver) });
  } catch (error) {
    console.error('Profile Fetch Error:', error);
    return res.status(500).json({ error: 'خطای سرور در دریافت پروفایل' });
  }
});

// The panel also calls these right after the profile. It already tolerates failures,
// but returning empty lists removes the 404 noise from the console.
router.get('/vehicles', authMiddleware, (_req, res) => res.json({ vehicles: [] }));
router.get('/missions', authMiddleware, (_req, res) => res.json({ missions: [] }));

module.exports = router;