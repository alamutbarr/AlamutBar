import api from "./axios.config";

// درخواست ارسال کد تأیید پیامکی
export const requestOtp = async (phoneNumber) => {
  const res = await api.post("/auth/request-otp", {
    phone_number: phoneNumber,
  });
  return res.data.data; // { devOtpCode } - فقط وقتی درگاه پیامک واقعی وصل نیست پر است
};

// تأیید کد؛ برای کاربر جدید فیلدهای پروفایل هم ارسال می‌شود
export const verifyOtp = async ({ phoneNumber, otpCode, profile = {} }) => {
  const res = await api.post("/auth/verify-otp", {
    phone_number: phoneNumber,
    otp_code: otpCode,
    ...profile,
  });
  return res.data.data; // { token, user }
};

// اطلاعات پروفایل کاربر واردشده
export const getProfile = async () => {
  const res = await api.get("/auth/me");
  return res.data.data;
};

// ویرایش پروفایل؛ فقط فیلدهای ارسال‌شده تغییر می‌کنند
export const updateProfile = async (fields) => {
  const res = await api.patch("/auth/me", fields);
  return res.data.data;
};
