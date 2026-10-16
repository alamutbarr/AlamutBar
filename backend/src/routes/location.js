// backend/src/routes/location.js
//
// مسیرهای عمومی برای فهرست استان‌ها/شهرها و جست‌وجوی تایپی آن‌ها.
// منبع داده: backend/src/services/geoData.js که از فایل‌های iranCities.json /
// iranProvinces.json / iranCountyCenters.json می‌خواند (بدون هاردکد).

const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { getProvinces, searchLocations } = require('../services/geoData');
const { resolveDriverProvince } = require('../services/geocoding');

const router = express.Router();

// GET /api/location/provinces
// فهرست کامل استان‌های ایران (برای حالت اولیه‌ی Dropdown، بدون تایپ).
router.get('/provinces', authMiddleware, (_req, res) => {
  res.json({ provinces: getProvinces() });
});

// GET /api/location/search?q=...
// جست‌وجوی ترکیبی استان + شهر برای Autocomplete مبدأ/مقصد در جست‌وجوی دستی.
router.get('/search', authMiddleware, (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q : '';
  const result = searchLocations(q, { limit: 30 });
  res.json(result);
});

// GET /api/location/reverse?lat=..&lng=..
// تعیین استان راننده از روی مختصات GPS واقعی (Reverse Geocoding از Nominatim،
// با fallback محلی مبتنی بر نزدیک‌ترین شهر در صورت شکست سرویس خارجی).
router.get('/reverse', authMiddleware, async (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return res.status(400).json({ error: 'مختصات جغرافیایی نامعتبر است.' });
  }

  try {
    const result = await resolveDriverProvince(lat, lng);
    return res.json(result);
  } catch (error) {
    console.error('Reverse Geocoding Error:', error.message);
    return res.status(502).json({ error: 'تعیین استان از روی موقعیت مکانی ممکن نشد. لطفاً دوباره تلاش کنید.' });
  }
});

module.exports = router;
