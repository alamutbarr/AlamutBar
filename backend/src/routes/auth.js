const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

const { Driver } = require('../models');
const { validateVehicleSelection } = require('../services/vehicleConfig');
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// حروف مجاز پلاک (هماهنگ با frontend/src/driver/components/IranianPlateInput.jsx)
const ALLOWED_PLATE_LETTERS = ['ع', 'ب', 'ج', 'د', 'س', 'ص', 'ط', 'ق', 'ک', 'ل', 'م', 'ن', 'و', 'ه', 'ی', '♿'];

// ==========================================
// ۱. درخواست پیامک
// ==========================================
router.post('/request-otp', async (req, res) => {
  try {
    const { mobile } = req.body;

    // کدهای مربوط به ارسال اس‌ام‌اس شما اینجا قرار می‌گیرد...
    // فعلأ فرض می‌کنیم پیامک با موفقیت ارسال شده است.

    return res.json({ message: 'کد تایید ارسال شد' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'خطا در ارسال پیامک' });
  }
});

// ==========================================
// ۲. تایید پیامک و ورود (اصلاح شده برای phone_number)
// ==========================================
// داخل روت تایید پیامک
router.post('/verify-otp', async (req, res) => {
  const { mobile, code, mode } = req.body;

  // ------------ اضافه کردن این 3 خط ------------
  if (code !== '1234') {
    return res.status(400).json({ message: 'کد وارد شده اشتباه است.' });
  }
  // ---------------------------------------------

  try {
    // ادامه کدهای شما برای سرچ در دیتابیس و تولید توکن ...
    const { mobile, code } = req.body;

    if (code !== "1234") {
      return res.status(400).json({ error: 'کد نامعتبر است' });
    }

    // جستجو بر اساس phone_number (طبق دیتابیس شما)
    const driver = await Driver.findOne({ where: { phone_number: mobile } });

    if (!driver) {
      return res.status(404).json({ error: 'کاربری با این شماره یافت نشد. لطفاً ثبت‌نام کنید.' });
    }

    const token = jwt.sign({ id: driver.id, role: 'driver' }, JWT_SECRET, {
      expiresIn: '7d',
    });

    return res.json({
      token,
      user: {
        id: driver.id,
        name: `${driver.first_name || ''} ${driver.last_name || ''}`.trim(),
        mobile: driver.phone_number
      }
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'خطای سرور در ورود' });
  }
});

// ==========================================
// ۳. ثبت نام راننده جدید (کاملاً منطبق با xbar_db.sql)
// ==========================================
router.post('/register-driver', async (req, res) => {
  try {
    const {
      mobile,
      code,
      name,
      nationalCode,
      licenseNumber,
      tractorType,
      trailerType,
      smartCardNumber,
      plate,
      vehicleSpecs,
    } = req.body;

    if (!mobile || !code || !name || !nationalCode || !licenseNumber) {
      return res.status(400).json({ error: 'لطفاً تمامی فیلدها را پر کنید' });
    }

    // جدا کردن نام و نام خانوادگی
    const nameParts = name.split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || '';

    // بررسی اینکه شماره قبلاً ثبت نشده باشد
    const existingDriver = await Driver.findOne({ where: { phone_number: mobile } });
    if (existingDriver) {
      return res.status(400).json({ error: 'این شماره قبلاً در سیستم ثبت شده است' });
    }

    // بررسی کد تایید
    if (code !== "1234") {
      return res.status(400).json({ error: 'کد نامعتبر است' });
    }

    // ----- اعتبارسنجی پلاک (بخش‌بندی‌شده + حروف مجاز) -----
    const plateParts = typeof plate === 'string' ? plate.split('-') : [];
    if (
      plateParts.length !== 4 ||
      !/^\d{2}$/.test(plateParts[0] || '') ||
      !/^\d{3}$/.test(plateParts[2] || '') ||
      !/^\d{2}$/.test(plateParts[3] || '')
    ) {
      return res.status(400).json({ error: 'پلاک خودرو را کامل و معتبر وارد کنید.' });
    }
    if (!ALLOWED_PLATE_LETTERS.includes(plateParts[1])) {
      return res.status(400).json({ error: 'حرف پلاک معتبر نیست.' });
    }

    // ----- اعتبارسنجی شماره هوشمند (دقیقاً ۷ رقم) -----
    if (!/^\d{7}$/.test(String(smartCardNumber || ''))) {
      return res.status(400).json({ error: 'شماره هوشمند باید دقیقاً ۷ رقم باشد.' });
    }

    // ----- اعتبارسنجی نوع کشنده/گاری و فیلدهای پویا -----
    const vehicle = validateVehicleSelection(tractorType, trailerType, vehicleSpecs);
    if (!vehicle.valid) {
      return res.status(400).json({ error: vehicle.error });
    }

    // ساخت راننده جدید با اطلاعات خودرو (فقط مقادیر معتبر و مرتبط ذخیره می‌شوند)
    // شناسه (id) توسط Sequelize به‌صورت خودکار INTEGER AUTO_INCREMENT تولید می‌شود.
    const newDriver = await Driver.create({
      phone_number: mobile,
      first_name: firstName,
      last_name: lastName,
      national_id: nationalCode,
      license_number: licenseNumber,
      smart_card_number: String(smartCardNumber),
      tractor_type: tractorType,
      trailer_type: trailerType,
      plate,
      vehicle_specs: JSON.stringify(vehicle.sanitizedSpecs),
      profile_step: 4,
    });

    const token = jwt.sign({ id: newDriver.id, role: 'driver' }, JWT_SECRET, {
      expiresIn: '7d',
    });

    return res.json({
      token,
      user: {
        id: newDriver.id,
        name: `${newDriver.first_name} ${newDriver.last_name}`.trim(),
        mobile: newDriver.phone_number
      }
    });

  } catch (error) {
    console.error("Register Error:", error);
    return res.status(500).json({
      error: "جزئیات خطا: " + (error.message || error.toString())
    });
  }
});

module.exports = router;