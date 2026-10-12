// backend/src/controllers/authController.js
const jwt = require('jsonwebtoken');
const Driver = require('../models/Driver');

// حروف مجاز پلاک (هماهنگ با frontend/src/driver/components/IranianPlateInput.jsx)
const ALLOWED_PLATE_LETTERS = ['ب', 'ج', 'د', 'س', 'ص', 'ط', 'ق', 'ک', 'ل', 'م', 'ن', 'و', 'ه', 'ی', '♿'];

exports.requestOtp = async (req, res) => {
    const { mobile, mode } = req.body;

    try {
        const existingDriver = await Driver.findOne({ where: { mobile } });

        if (mode === 'register' && existingDriver && existingDriver.profileStep === 4) {
            return res.status(400).json({ message: 'این شماره تلفن قبلاً ثبت شده است. لطفاً از بخش ورود استفاده کنید.' });
        }

        if (mode === 'login' && !existingDriver) {
            return res.status(404).json({ message: 'حسابی با این شماره تلفن پیدا نشد. لطفاً ابتدا ثبت‌نام کنید.' });
        }

        // در اینجا کد OTP تولید و پیامک می‌شود (فعلا برای توسعه 1234 در نظر می‌گیریم)
        // await sendSms(mobile, '1234');

        res.json({ success: true, message: 'کد تایید ارسال شد.' });
    } catch (error) {
        res.status(500).json({ message: 'خطای سرور در ارسال کد' });
    }
};

exports.verifyOtp = async (req, res) => {
    const { mobile, code } = req.body;

    try {
        // بررسی صحت کد
        if (code !== '1234') {
            return res.status(400).json({ message: 'کد وارد شده اشتباه است.' });
        }

        let driver = await Driver.findOne({ where: { mobile } });

        if (!driver) {
            // ایجاد کاربر جدید برای ثبت نام با وضعیت مرحله 2
            driver = await Driver.create({ mobile, profileStep: 2 });
        }

        // تولید توکن
        const token = jwt.sign({ id: driver.id }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });

        res.json({
            success: true,
            token,
            driver: { id: driver.id, mobile: driver.mobile, profileStep: driver.profileStep }
        });
    } catch (error) {
        res.status(500).json({ message: 'خطای سرور در تایید کد' });
    }
};

exports.completePersonalInfo = async (req, res) => {
    const { firstName, lastName, nationalCode } = req.body;
    try {
        await Driver.update(
            { firstName, lastName, nationalCode, profileStep: 3 },
            { where: { id: req.user.id } } // req.user.id از میدلور auth میاد
        );
        res.json({ success: true, profileStep: 3 });
    } catch (error) {
        res.status(500).json({ message: 'خطا در ثبت اطلاعات شخصی' });
    }
};

exports.completeVehicleInfo = async (req, res) => {
    const { tractorType, trailerType, dimensions, plate, smartCardNumber } = req.body;

    const plateLetter = typeof plate === 'string' ? plate.split('-')[1] : undefined;
    if (!plateLetter || !ALLOWED_PLATE_LETTERS.includes(plateLetter)) {
        return res.status(400).json({ message: 'حرف پلاک معتبر نیست.' });
    }
    if (!/^\d{7}$/.test(String(smartCardNumber || ''))) {
        return res.status(400).json({ message: 'شماره هوشمند باید دقیقاً ۷ رقم باشد.' });
    }

    try {
        // 1. ثبت اطلاعات خودرو در دیتابیس (Vehicle.create)
        // 2. آپدیت وضعیت راننده به تکمیل شده
        await Driver.update(
            { smartCardNumber, profileStep: 4 },
            { where: { id: req.user.id } }
        );
        res.json({ success: true, profileStep: 4 });
    } catch (error) {
        res.status(500).json({ message: 'خطا در ثبت اطلاعات خودرو' });
    }
};