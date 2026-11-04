const express = require('express');
const { Op } = require('sequelize');
const { authMiddleware } = require('../middleware/auth');
// IMPORTANT: exact file-name casing (Driver.js). '../models/driver' breaks on Linux/macOS
// and can load the model twice on Windows.
const Driver = require('../models/Driver');
const { Shipment, DriverDocument } = require('../models');
const { toMissionDto } = require('../utils/missionMapper');
const { filterNearbyMissions, filterMissionsByRoute } = require('../services/missionSearch');
const { findNearestProvinceByCoords } = require('../services/geoData');

const router = express.Router();

// Convert the DB row (first_name, last_name, national_id, ...) into the shape the
// React panel reads (name, mobile, nationalCode, licenseNumber, rating, ...).
function toPanelDriver(row) {
  const d = row.toJSON ? row.toJSON() : row;
  const name = [d.firstName, d.lastName].filter(Boolean).join(' ').trim();
  return {
    id: d.id,
    name: name || 'راننده',
    mobile: d.phoneNumber,
    phone_number: d.phoneNumber,
    nationalCode: d.nationalId || '',
    licenseNumber: d.licenseNumber || '',
    plate: d.plate || '',
    tractorType: d.tractorType || '',
    trailerType: d.trailerType || '',
    verifiedStatus: d.verificationStatus || 'pending',
    verificationNote: d.verificationNote || null,
    rating: 5.0,
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

// GET /api/driver/missions
// همان مجموعه‌ی قبلی: پیشنهادهای باز (status=Offered) + مأموریت‌هایی که به این
// راننده اختصاص دارند (فعال/سوابق). این لیست پایه برای سه تب صفحه‌ی
// «مأموریت‌ها» (پیشنهادها/فعال/سوابق) است و با قابلیت جست‌وجوی مکانی جدید
// (نهایتاً جایگزین/تکمیل‌کننده‌ی همان تب «پیشنهادها») جایگزین نمی‌شود.
router.get('/missions', authMiddleware, async (req, res) => {
  try {
    const rows = await Shipment.findAll({
      where: {
        [Op.or]: [{ status: 'Offered' }, { driverId: req.user.id }],
      },
      order: [['createdAt', 'DESC']],
    });
    return res.json({ missions: rows.map(toMissionDto) });
  } catch (error) {
    console.error('Missions Fetch Error:', error);
    return res.status(500).json({ error: 'خطای سرور در دریافت مأموریت‌ها' });
  }
});

// POST /api/driver/missions/:id/change-status
router.post('/missions/:id/change-status', authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const mission = await Shipment.findByPk(req.params.id);
    if (!mission) {
      return res.status(404).json({ error: 'مأموریت پیدا نشد' });
    }

    const update = { status };
    if (status === 'Accepted') update.driverId = req.user.id;
    if (status === 'InTransit') update.moveStartedAt = new Date();
    if (status === 'WaybillIssued') update.visibleDestinationExact = true;
    if (status === 'Completed') update.completedAt = new Date();
    if (status === 'Cancelled' || status === 'Declined') update.cancelledAt = new Date();

    await mission.update(update);
    return res.json({ message: 'وضعیت بروزرسانی شد', status: mission.status });
  } catch (error) {
    console.error('Mission Status Update Error:', error);
    return res.status(500).json({ error: 'خطای سرور در بروزرسانی وضعیت' });
  }
});

// GET /api/driver/missions/nearby?lat=..&lng=..&destProvince=..(اختیاری)
//
// بخش «بارهای اطراف من»: فقط روی بارهای هنوز پیشنهادنشده (status=Offered)
// اعمال می‌شود تا مأموریت‌های فعال/سوابق راننده دست‌نخورده باقی بمانند.
// شعاع حداکثر ۱۰۰ کیلومتر از روی مختصات واقعی GPS و originLat/originLng
// محموله محاسبه می‌شود (نه نام استان).
router.get('/missions/nearby', authMiddleware, async (req, res) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const destProvince = typeof req.query.destProvince === 'string' && req.query.destProvince.trim()
      ? req.query.destProvince.trim()
      : null;

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return res.status(400).json({ error: 'مختصات جغرافیایی نامعتبر است.' });
    }

    const offeredShipments = await Shipment.findAll({ where: { status: 'Offered' } });

    // استان راننده از روی موقعیت مکانی تعیین می‌شود تا «بارهای اطراف» به‌تدریج
    // گسترش یابد و در نهایت کل استان را در بر بگیرد.
    const driverProvince = findNearestProvinceByCoords(lat, lng)?.province || null;

    const matches = filterNearbyMissions(offeredShipments, {
      driverLat: lat,
      driverLng: lng,
      destProvinceName: destProvince,
      driverProvince,
    });

    const missions = matches.map(({ shipment, distanceKm, bandKm }) => ({
      ...toMissionDto(shipment),
      distanceKm,
      bandKm,
    }));

    // باندهای شعاعی‌ای که واقعاً بار دارند (به ترتیب صعودی) برای نمایش پلکانی در UI
    const bands = [...new Set(matches.map((m) => m.bandKm))].sort((a, b) => a - b);

    return res.json({ missions, driverProvince, bands });
  } catch (error) {
    console.error('Nearby Missions Error:', error);
    return res.status(500).json({ error: 'خطای سرور در جست‌وجوی بارهای اطراف' });
  }
});

// GET /api/driver/missions/search?originCityId=&originProvinceId=&destCityId=&destProvinceId=
//
// بخش «جست‌وجوی دستی»: تطبیق بارهای پیشنهادی (status=Offered) با مبدأ/مقصد
// انتخاب‌شده‌ی راننده از فهرست شهرها/استان‌ها.
router.get('/missions/search', authMiddleware, async (req, res) => {
  try {
    const { originCityId, originProvinceId, destCityId, destProvinceId } = req.query;

    if (!originCityId && !originProvinceId && !destCityId && !destProvinceId) {
      return res.status(400).json({ error: 'حداقل یک فیلتر مبدأ یا مقصد باید انتخاب شود.' });
    }

    const offeredShipments = await Shipment.findAll({ where: { status: 'Offered' } });
    const matches = filterMissionsByRoute(offeredShipments, {
      originCityId: originCityId || null,
      originProvinceId: originProvinceId || null,
      destCityId: destCityId || null,
      destProvinceId: destProvinceId || null,
    });

    const missions = matches.map(({ shipment }) => toMissionDto(shipment));
    return res.json({ missions });
  } catch (error) {
    console.error('Mission Route Search Error:', error);
    return res.status(500).json({ error: 'خطای سرور در جست‌وجوی مسیر' });
  }
});

// GET /api/driver/verification
// مدارک احراز هویتِ راننده‌ی جاری به‌همراه وضعیت بررسی توسط اپراتور.
router.get('/verification', authMiddleware, async (req, res) => {
  try {
    const docs = await DriverDocument.findAll({ where: { driverId: req.user.id } });
    const documents = {};
    for (const doc of docs) {
      documents[doc.section] = documents[doc.section] || {};
      documents[doc.section][doc.slot] = doc.imageData;
    }

    const driver = await Driver.findByPk(req.user.id);
    return res.json({
      documents,
      verificationStatus: driver ? driver.verificationStatus || 'pending' : 'pending',
      verificationNote: driver ? driver.verificationNote || null : null,
    });
  } catch (error) {
    console.error('Verification Fetch Error:', error);
    return res.status(500).json({ error: 'خطای سرور در دریافت مدارک.' });
  }
});

// POST /api/driver/verification/documents
// ذخیره‌ی یک عکس مدرک (ایجاد یا به‌روزرسانی) روی سرور.
router.post('/verification/documents', authMiddleware, async (req, res) => {
  try {
    const { section, slot, dataUrl, mimeType } = req.body || {};
    if (!section || !slot || !dataUrl) {
      return res.status(400).json({ error: 'بخش، جایگاه و تصویر مدرک الزامی است.' });
    }
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
      return res.status(400).json({ error: 'تصویر مدرک نامعتبر است.' });
    }

    const [doc, created] = await DriverDocument.findOrCreate({
      where: { driverId: req.user.id, section, slot },
      defaults: { imageData: dataUrl, mimeType: mimeType || 'image/jpeg' },
    });
    if (!created) {
      await doc.update({ imageData: dataUrl, mimeType: mimeType || 'image/jpeg' });
    }

    return res.json({ message: 'مدرک ذخیره شد.', section, slot });
  } catch (error) {
    console.error('Verification Upload Error:', error);
    return res.status(500).json({ error: 'خطای سرور در ذخیره مدرک.' });
  }
});

// DELETE /api/driver/verification/documents/:section/:slot
// حذف یک عکس مدرک از سرور.
router.delete('/verification/documents/:section/:slot', authMiddleware, async (req, res) => {
  try {
    const { section, slot } = req.params;
    await DriverDocument.destroy({ where: { driverId: req.user.id, section, slot } });
    return res.json({ message: 'مدرک حذف شد.', section, slot });
  } catch (error) {
    console.error('Verification Delete Error:', error);
    return res.status(500).json({ error: 'خطای سرور در حذف مدرک.' });
  }
});

module.exports = router;
