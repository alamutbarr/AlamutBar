import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import {
  Truck,
  Phone,
  Loader2,
  User,
  CreditCard,
  Award,
  ArrowRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const DEV_OTP_ENABLED = true;
const FIXED_OTP_CODE = "1234";

// ================= توابع اعتبارسنجی =================
const validateMobile = (mobile) => {
  if (!mobile) return false;
  let str = String(mobile).replace(/[\s\-\(\)]/g, "");
  if (str.startsWith("+98")) str = "0" + str.slice(3);
  if (str.startsWith("0098")) str = "0" + str.slice(4);
  if (str.startsWith("98") && str.length === 12) str = "0" + str.slice(2);
  if (/^9\d{9}$/.test(str)) str = "0" + str;
  return /^09[0-9]\d{8}$/.test(str);
};

const validateNationalId = (code) => {
  if (!/^\d{10}$/.test(code)) return false;
  if (/^(\d)\1{9}$/.test(code)) return false;
  const check = parseInt(code[9], 10);
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(code[i], 10) * (10 - i);
  const remainder = sum % 11;
  return (
    (remainder < 2 && check === remainder) ||
    (remainder >= 2 && check === 11 - remainder)
  );
};

const validateDrivingLicense = (license) => {
  if (!/^\d{10}$/.test(license)) return false;
  if (/^(\d)\1{9}$/.test(license)) return false;
  return true;
};
// ======================================================

export function DriverLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState("login"); // "login" | "register"
  const [step, setStep] = useState("idle"); // "idle" | "sent"

  const [mobile, setMobile] = useState("");
  const [code, setCode] = useState("");

  // فیلدهای ثبت‌نام
  const [name, setName] = useState("");
  const [nationalCode, setNationalCode] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const getErrorMessage = (error, fallback) => {
    if (error.response?.data?.message) return error.response.data.message;
    if (error.response?.data?.error) return error.response.data.error;
    return fallback;
  };

  const handleSendOtp = async () => {
    if (!validateMobile(mobile)) {
      setError("شماره موبایل وارد شده نامعتبر است.");
      return;
    }

    if (mode === "register") {
      if (!name.trim()) return setError("نام و نام خانوادگی الزامی است.");
      if (!validateNationalId(nationalCode))
        return setError("کد ملی وارد شده نامعتبر است.");
      if (!validateDrivingLicense(licenseNumber))
        return setError("شماره گواهینامه نامعتبر است (باید ۱۰ رقم باشد).");
    }

    setLoading(true);
    setError("");

    try {
      // Send the mode to the backend so it can apply the correct validation
      await api.post("/auth/request-otp", { mobile, mode });
      setStep("sent");

      if (DEV_OTP_ENABLED) {
        setCode(FIXED_OTP_CODE);
      }
    } catch (e) {
      setError(getErrorMessage(e, "خطا در ارتباط با سرور"));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setLoading(true);
    setError("");

    try {
      let res;
      // Trigger correct endpoint based on selected mode
      if (mode === "login") {
        res = await api.post("/auth/verify-otp", { mobile, code: code.trim() });
      } else {
        res = await api.post("/auth/register-driver", {
          mobile,
          code: code.trim(),
          name,
          nationalCode,
          licenseNumber,
        });
      }

      if (!res.data?.token) {
        setError("سرور توکن ورود را برنگرداند.");
        return;
      }

      // Automatically Login and Redirect
      login(res.data.token, res.data.user);
      navigate("/dashboard", { replace: true });
    } catch (e) {
      setError(getErrorMessage(e, "کد اشتباه است یا خطایی رخ داد."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg mb-4">
            <Truck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Xbar راننده</h1>
        </div>

        <div className="rounded-3xl bg-white/95 backdrop-blur-xl shadow-2xl p-6 sm:p-8">
          {DEV_OTP_ENABLED && step !== "idle" && (
            <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
              حالت توسعه فعال است؛ کد ورود: {FIXED_OTP_CODE}
            </div>
          )}

          {step === "idle" && (
            <>
              {/* Tab Switcher */}
              <div className="flex bg-slate-100 p-1.5 rounded-xl mb-6">
                <button
                  onClick={() => {
                    setMode("login");
                    setError("");
                  }}
                  className={`flex-1 py-2.5 rounded-lg font-bold text-sm transition-all ${
                    mode === "login"
                      ? "bg-white shadow text-blue-600"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  ورود
                </button>
                <button
                  onClick={() => {
                    setMode("register");
                    setError("");
                  }}
                  className={`flex-1 py-2.5 rounded-lg font-bold text-sm transition-all ${
                    mode === "register"
                      ? "bg-white shadow text-blue-600"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  ثبت نام
                </button>
              </div>

              {/* Shared Field: Mobile */}
              <div className="relative mb-4">
                <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="tel"
                  value={mobile}
                  onChange={(e) => {
                    setMobile(e.target.value);
                    setError("");
                  }}
                  placeholder="شماره موبایل (مثال: 09123456789)"
                  maxLength={14}
                  dir="ltr"
                  className="w-full rounded-xl border-2 border-slate-200 py-3.5 pr-11 pl-4 focus:border-blue-500 focus:outline-none transition-colors"
                />
              </div>

              {/* Extra Fields specifically for Registration */}
              {mode === "register" && (
                <div className="space-y-4 mb-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="relative">
                    <User className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        setError("");
                      }}
                      placeholder="نام و نام خانوادگی"
                      className="w-full rounded-xl border-2 border-slate-200 py-3.5 pr-11 pl-4 focus:border-blue-500 focus:outline-none transition-colors"
                    />
                  </div>
                  <div className="relative">
                    <CreditCard className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="tel"
                      value={nationalCode}
                      onChange={(e) => {
                        setNationalCode(e.target.value.replace(/\D/g, ""));
                        setError("");
                      }}
                      placeholder="کد ملی (۱۰ رقم)"
                      maxLength={10}
                      dir="ltr"
                      className="w-full rounded-xl border-2 border-slate-200 py-3.5 pr-11 pl-4 focus:border-blue-500 focus:outline-none transition-colors"
                    />
                  </div>
                  <div className="relative">
                    <Award className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="tel"
                      value={licenseNumber}
                      onChange={(e) => {
                        setLicenseNumber(e.target.value.replace(/\D/g, ""));
                        setError("");
                      }}
                      placeholder="شماره گواهینامه (۱۰ رقم)"
                      maxLength={10}
                      dir="ltr"
                      className="w-full rounded-xl border-2 border-slate-200 py-3.5 pr-11 pl-4 focus:border-blue-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              )}

              {error && (
                <p className="text-sm text-red-500 mb-4 text-center font-medium">
                  {error}
                </p>
              )}

              <button
                onClick={handleSendOtp}
                disabled={mobile.length < 10 || loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3.5 font-bold text-white disabled:opacity-60 transition-transform active:scale-[0.98]"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "دریافت کد تأیید"
                )}
              </button>
            </>
          )}

          {step === "sent" && (
            <div className="animate-in slide-in-from-right-4 duration-300">
              <button
                onClick={() => setStep("idle")}
                className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-5"
              >
                <ArrowRight className="w-4 h-4" />
                اصلاح اطلاعات / بازگشت
              </button>

              <h2 className="text-lg font-bold text-slate-800 mb-2">
                کد تأیید را وارد کنید
              </h2>
              <p className="text-sm text-slate-500 mb-5">
                کد پیامک شده به شماره{" "}
                <span dir="ltr" className="font-bold text-slate-700">
                  {mobile}
                </span>{" "}
                را وارد کنید.
              </p>

              <input
                type="tel"
                maxLength={4}
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.replace(/\D/g, ""));
                  setError("");
                }}
                placeholder="----"
                dir="ltr"
                className="w-full text-center text-3xl font-bold tracking-[0.5em] rounded-xl border-2 border-slate-200 py-4 mb-4 focus:border-green-500 focus:outline-none transition-colors"
              />

              {error && (
                <p className="text-sm text-red-500 mb-4 text-center font-medium">
                  {error}
                </p>
              )}

              <button
                onClick={handleVerify}
                disabled={code.trim().length < 4 || loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3.5 font-bold text-white disabled:opacity-60 transition-transform active:scale-[0.98]"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : mode === "login" ? (
                  "تأیید و ورود"
                ) : (
                  "تأیید و تکمیل ثبت نام"
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
