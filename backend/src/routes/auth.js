const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto'); // اضافه شدن برای تولید آیدی 36 کاراکتری
const router = express.Router();

const { Driver } = require('../models');
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

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
    const { mobile, code, name, nationalCode, licenseNumber } = req.body;

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

    // ساخت راننده جدید (دقیقاً با ستون‌های دیتابیس شما)
    const newDriver = await Driver.create({
      id: crypto.randomUUID(),           // تولید آیدی 36 کاراکتری
      phone_number: mobile,              // ستون phone_number
      first_name: firstName,             // ستون first_name
      last_name: lastName,               // ستون last_name
      national_id: nationalCode,         // ستون national_id
      license_number: licenseNumber,     // ستون license_number
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