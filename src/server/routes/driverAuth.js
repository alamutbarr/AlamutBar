const express = require('express');
const jwt = require('jsonwebtoken');
const Driver = require('../models/Driver');
const { validateVehicleSelection } = require('../services/vehicleConfig');

const router = express.Router();
const OTP = '1234';
const ALLOWED_PLATE_LETTERS = ['ع', 'ب', 'ج', 'د', 'س', 'ص', 'ط', 'ق', 'ک', 'ل', 'م', 'ن', 'و', 'ه', 'ی', '♿'];

function signDriver(driver) {
  const token = jwt.sign(
    { id: driver.id, role: 'driver' },
    process.env.JWT_SECRET,
    { expiresIn: '7d' },
  );
  return {
    token,
    user: {
      id: driver.id,
      name: `${driver.firstName || ''} ${driver.lastName || ''}`.trim(),
      mobile: driver.phoneNumber,
    },
  };
}

router.post('/request-otp', (_req, res) => {
  res.json({ message: 'کد تایید ارسال شد', devOtpCode: OTP });
});

router.post('/verify-otp', async (req, res) => {
  try {
    const { mobile, code } = req.body;
    if (code !== OTP) return res.status(400).json({ error: 'کد وارد شده اشتباه است.' });
    const driver = await Driver.findOne({ where: { phoneNumber: mobile } });
    if (!driver) {
      return res.status(404).json({ error: 'کاربری با این شماره یافت نشد. لطفاً ثبت‌نام کنید.' });
    }
    return res.json(signDriver(driver));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'خطای سرور در ورود' });
  }
});

router.post('/register-driver', async (req, res) => {
  try {
    const {
      mobile, code, name, nationalCode, licenseNumber,
      tractorType, trailerType, smartCardNumber, plate, vehicleSpecs,
    } = req.body;

    if (!mobile || !code || !name || !nationalCode || !licenseNumber) {
      return res.status(400).json({ error: 'لطفاً تمامی فیلدها را پر کنید' });
    }
    if (code !== OTP) return res.status(400).json({ error: 'کد نامعتبر است' });

    const existing = await Driver.findOne({ where: { phoneNumber: mobile } });
    if (existing) return res.status(400).json({ error: 'این شماره قبلاً در سیستم ثبت شده است' });

    const plateParts = typeof plate === 'string' ? plate.split('-') : [];
    if (
      plateParts.length !== 4
      || !/^\d{2}$/.test(plateParts[0] || '')
      || !/^\d{3}$/.test(plateParts[2] || '')
      || !/^\d{2}$/.test(plateParts[3] || '')
    ) {
      return res.status(400).json({ error: 'پلاک خودرو را کامل و معتبر وارد کنید.' });
    }
    if (!ALLOWED_PLATE_LETTERS.includes(plateParts[1])) {
      return res.status(400).json({ error: 'حرف پلاک معتبر نیست.' });
    }
    if (!/^\d{7}$/.test(String(smartCardNumber || ''))) {
      return res.status(400).json({ error: 'شماره هوشمند باید دقیقاً ۷ رقم باشد.' });
    }

    const vehicle = validateVehicleSelection(tractorType, trailerType, vehicleSpecs);
    if (!vehicle.valid) return res.status(400).json({ error: vehicle.error });

    const nameParts = String(name).trim().split(/\s+/);
    const driver = await Driver.create({
      phoneNumber: mobile,
      firstName: nameParts[0],
      lastName: nameParts.slice(1).join(' ') || ' ',
      nationalId: nationalCode,
      licenseNumber,
      smartCardNumber: String(smartCardNumber),
      tractorType,
      trailerType,
      plate,
      vehicleSpecs: vehicle.sanitizedSpecs,
      profileStep: 4,
    });
    return res.json(signDriver(driver));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: `جزئیات خطا: ${error.message || error}` });
  }
});

module.exports = router;
