import { createContext, useState, useEffect } from "react";
import { requestOtp, verifyOtp, getProfile } from "../api/auth.api";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    const token = localStorage.getItem("token");

    // محافظت در برابر داده‌ی خراب localStorage (مثلاً مقدار "undefined" یا JSON نامعتبر)
    const isCorrupt = (value) => !value || value === "undefined";
    if (isCorrupt(savedUser) || isCorrupt(token)) {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
    } else {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem("user");
        localStorage.removeItem("token");
      }
      // نسخه‌ی ذخیره‌شده در مرورگر ممکن است قدیمی باشد؛ اطلاعات واقعی پروفایل از Backend خوانده می‌شود
      getProfile()
        .then((fresh) => {
          if (!localStorage.getItem("token")) return; // اگر در همین فاصله خارج شده، کاربر دوباره ساخته نشود
          setUser((prev) => {
            if (!prev) return prev;
            const next = { ...prev, ...fresh };
            localStorage.setItem("user", JSON.stringify(next));
            return next;
          });
        })
        .catch(() => {});
    }
    setLoading(false);
  }, []);

  const sendOtp = async (phoneNumber) => {
    return requestOtp(phoneNumber); // { devOtpCode } در حالت توسعه
  };

  // profile فقط برای کاربر جدید لازم است؛ برای کاربر قدیمی نادیده گرفته می‌شود
  const confirmOtp = async (phoneNumber, otpCode, profile) => {
    const data = await verifyOtp({ phoneNumber, otpCode, profile });
    // اگر پاسخ ناقص بود، توکن/کاربر خراب (مثل "undefined") ذخیره نشود
    if (data?.token && data?.user) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      setUser(data.user);
    }
    return data;
  };

  // به‌روزرسانی اطلاعات کاربر بعد از ویرایش پروفایل (نام در منو هم همین‌جا عوض می‌شود)
  const updateUser = (partial) => {
    setUser((prev) => {
      const next = { ...prev, ...partial };
      localStorage.setItem("user", JSON.stringify(next));
      return next;
    });
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, sendOtp, confirmOtp, updateUser, logout, loading }}
    >
      {children}
    </AuthContext.Provider>
  );
};
