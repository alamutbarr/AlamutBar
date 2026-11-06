const jwt = require("jsonwebtoken");
const { User, CargoOwner } = require("../models");
const AppError = require("../utils/AppError");
const otpService = require("./otp.service");
const { isValidNationalId } = require("../utils/nationalId");
const ownerKyc = require("../admin/ownerKyc");
// درخواست کد تأیید: اگر کاربر وجود نداشته باشد، رکورد اولیه با نقش صاحب کالا ساخته می‌شود
async function requestOtp(phoneNumber) {
  let user = await User.findOne({ where: { phone_number: phoneNumber } });
  if (!user) {
    user = await User.create({
      phone_number: phoneNumber,
      role: "cargo_owner",
    });
  }

  otpService.assertCanResend(user);

  const code = otpService.generateOtp();
  user.otp_code = code;
  user.otp_expires_at = otpService.getOtpExpiry();
  user.otp_last_sent_at = new Date();
  user.otp_attempts = 0;
  await user.save();

  const smsResult = await otpService.sendOtpSms(phoneNumber, code);

  return {
    isNewUser: !user.is_phone_verified,
    // فقط وقتی درگاه واقعی وصل نیست (حالت توسعه) کد برای راحتی تست برگردانده می‌شود؛
    // به‌محض تنظیم SMS_PROVIDER در .env، این مقدار همیشه undefined خواهد بود.
    devOtpCode: smsResult.mocked ? code : undefined,
  };
}

// تأیید کد و صدور توکن. برای کاربر جدید، اطلاعات پروفایل هم لازم است.
async function verifyOtpAndAuthenticate({ phoneNumber, otpCode, profile }) {
  const user = await User.findOne({ where: { phone_number: phoneNumber } });
  if (!user) {
    throw new AppError("ابتدا درخواست کد تأیید بدهید.", 400);
  }

  try {
    otpService.verifyOtpMatch(user, otpCode);
  } catch (err) {
    if (err.isWrongOtp) {
      user.otp_attempts += 1;
      await user.save();
    }
    throw err;
  }

  // نکته‌ی مهم: کد OTP هنوز پاک نمی‌شود، چون ممکن است کاربر جدید باشد و این تابع
  // یک‌بار دیگر (این‌بار همراه با نام/نام‌خانوادگی) با همین کد صدا زده شود.
  let cargoOwner = await CargoOwner.findOne({ where: { user_id: user.id } });

  if (!cargoOwner) {
    if (!profile?.first_name || !profile?.last_name) {
      // نیاز به تکمیل پروفایل - خطای شناخته‌شده که فرانت آن را تشخیص می‌دهد
      const err = new AppError(
        "برای تکمیل ثبت‌نام، نام و نام خانوادگی را وارد کنید.",
        422,
      );
      err.code = "PROFILE_REQUIRED";
      throw err;
    }
    if (!isValidNationalId(profile?.national_id)) {
      // کد ملی برای کاربر جدید اجباری است
      const err = new AppError("کد ملی معتبر وارد کنید.", 422);
      err.code = "NATIONAL_ID_REQUIRED";
      throw err;
    }
    cargoOwner = await CargoOwner.create({
      user_id: user.id,
      first_name: profile.first_name,
      last_name: profile.last_name,
      company_name: profile.company_name || null,
      national_id: String(profile.national_id), // String تا صفر ابتدایی حفظ شود
    });
  } else if (!isValidNationalId(cargoOwner.national_id)) {
    // کاربر قدیمی بدون کد ملی معتبر: ورود مجدد با همان OTP همراه کد ملی
    if (!isValidNationalId(profile?.national_id)) {
      const err = new AppError("کد ملی معتبر وارد کنید.", 422);
      err.code = "NATIONAL_ID_REQUIRED";
      throw err;
    }
    cargoOwner.national_id = String(profile.national_id);
    await cargoOwner.save();
  }
  // فقط الان که کل فرآیند (کد + پروفایل در صورت نیاز) با موفقیت تمام شده، کد پاک می‌شود
  user.otp_code = null;
  user.otp_expires_at = null;
  user.otp_attempts = 0;
  user.is_phone_verified = true;
  await user.save();

  const token = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    },
  );

  return { token, user: serializeUser(user, cargoOwner) };
}

// شکل یکسان اطلاعات کاربر برای ورود، دریافت پروفایل و ویرایش پروفایل
function serializeUser(user, cargoOwner) {
  return {
    id: user.id,
    phone_number: user.phone_number,
    role: user.role,
    first_name: cargoOwner.first_name,
    last_name: cargoOwner.last_name,
    company_name: cargoOwner.company_name,
    national_id: cargoOwner.national_id,
    avatar_url: cargoOwner.avatar_url,
    postal_code: cargoOwner.postal_code || "",
    verification_status: cargoOwner.verification_status,
    kyc: ownerKyc.present(cargoOwner.kyc),
  };
}

async function loadProfile(userId) {
  const user = await User.findByPk(userId);
  const cargoOwner = await CargoOwner.findOne({ where: { user_id: userId } });
  if (!user || !cargoOwner) {
    throw new AppError("پروفایل کاربر پیدا نشد.", 404);
  }
  return { user, cargoOwner };
}

async function getProfile(userId) {
  const { user, cargoOwner } = await loadProfile(userId);
  return serializeUser(user, cargoOwner);
}

// فقط فیلدهایی که در درخواست آمده‌اند به‌روز می‌شوند؛ رشته‌ی خالی در فیلدهای اختیاری یعنی پاک کردن مقدار
async function updateProfile(userId, data) {
  const { user, cargoOwner } = await loadProfile(userId);

  ["first_name", "last_name", "company_name", "avatar_url"].forEach((key) => {
    if (data[key] === undefined) return;
    cargoOwner[key] = data[key] === "" ? null : data[key];
  });

  // کد ملی اجباری است: فقط مقدار معتبر قابل ذخیره/پاک نیست
  if (data.national_id !== undefined) {
    if (!isValidNationalId(data.national_id)) {
      throw new AppError("کد ملی نامعتبر است.", 400);
    }
    cargoOwner.national_id = String(data.national_id);
  }

  if (data.postal_code !== undefined) {
    const postal = String(data.postal_code || "").trim();
    if (!/^\d{10}$/.test(postal)) {
      throw new AppError("کد پستی باید ۱۰ رقم باشد.", 400);
    }
    cargoOwner.postal_code = postal;
  }

  // نام و نام خانوادگی ستون‌های اجباری‌اند و نباید خالی شوند
  if (!cargoOwner.first_name || !cargoOwner.last_name) {
    throw new AppError("نام و نام خانوادگی نمی‌تواند خالی باشد.", 400);
  }

  await cargoOwner.save();
  return serializeUser(user, cargoOwner);
}

async function saveOwnerKyc(userId, kyc) {
  const { user, cargoOwner } = await loadProfile(userId);
  const synced = ownerKyc.syncStatus(kyc);
  cargoOwner.kyc = synced.kyc;
  cargoOwner.changed("kyc", true);
  cargoOwner.verification_status = synced.verificationStatus;
  cargoOwner.verification_note = synced.verificationNote;
  await cargoOwner.save();
  return serializeUser(user, cargoOwner);
}

async function setKycIdType(userId, idType) {
  const { cargoOwner } = await loadProfile(userId);
  return saveOwnerKyc(userId, ownerKyc.setIdType(cargoOwner.kyc, idType));
}

async function uploadKycDocument(userId, { slot, idType, url }) {
  const { cargoOwner } = await loadProfile(userId);
  const next = ownerKyc.uploadDocument(cargoOwner.kyc, { key: slot, url, idType: idType || undefined });
  return saveOwnerKyc(userId, next);
}

module.exports = {
  requestOtp,
  verifyOtpAndAuthenticate,
  getProfile,
  updateProfile,
  setKycIdType,
  uploadKycDocument,
};
