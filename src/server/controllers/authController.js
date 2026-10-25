const asyncHandler = require("../utils/asyncHandler");
const { success } = require("../utils/apiResponse");
const AppError = require("../utils/AppError");
const authService = require("../services/auth.service");

const requestOtp = asyncHandler(async (req, res) => {
  const { phone_number } = req.body;
  const result = await authService.requestOtp(phone_number);
  success(res, {
    message: "کد تأیید برای شماره موبایل شما ارسال شد.",
    data: { devOtpCode: result.devOtpCode },
  });
});

const verifyOtp = asyncHandler(async (req, res) => {
  const {
    phone_number,
    otp_code,
    first_name,
    last_name,
    company_name,
    national_id,
  } = req.body;

  const result = await authService.verifyOtpAndAuthenticate({
    phoneNumber: phone_number,
    otpCode: otp_code,
    profile: { first_name, last_name, company_name, national_id },
  });
  success(res, { message: "ورود با موفقیت انجام شد.", data: result });
});

const getMe = asyncHandler(async (req, res) => {
  const user = await authService.getProfile(req.user.id);
  success(res, { data: user });
});

const updateMe = asyncHandler(async (req, res) => {
  const user = await authService.updateProfile(req.user.id, req.body);
  success(res, { message: "پروفایل با موفقیت ذخیره شد.", data: user });
});

const setKycIdType = asyncHandler(async (req, res) => {
  const user = await authService.setKycIdType(req.user.id, req.body.idType);
  success(res, { message: "نوع مدرک شناسایی ذخیره شد.", data: user });
});

const uploadKyc = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError("تصویر مدرک را انتخاب کنید.", 400);
  const user = await authService.uploadKycDocument(req.user.id, {
    slot: req.body.slot,
    idType: req.body.idType,
    url: `/uploads/${req.file.filename}`,
  });
  success(res, { message: "مدرک ارسال شد و در انتظار بررسی است.", data: user });
});

module.exports = { requestOtp, verifyOtp, getMe, updateMe, setKycIdType, uploadKyc };
