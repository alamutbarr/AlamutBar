import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import { IranianPlateInput } from "@/driver/components/IranianPlateInput";
import {
  Truck,
  Phone,
  Loader2,
  User,
  CreditCard,
  ArrowRight,
  ShieldCheck,
  Ruler,
  IdCard,
  Award,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const FIXED_OTP_CODE = "1234";

// ================= توابع اعتبارسنجی =================
const validateMobile = (mobile) =>
  /^09[0-9]\d{8}$/.test(mobile.replace(/[\s\-\(\)]/g, ""));
const validateNationalId = (code) => {
  if (!/^\d{10}$/.test(code)) return false;
  const check = +code[9];
  const sum =
    code
      .split("")
      .slice(0, 9)
      .reduce((acc, x, i) => acc + +x * (10 - i), 0) % 11;
  return sum < 2 ? check === sum : check === 11 - sum;
};
const validateDrivingLicense = (license) => /^\d{10}$/.test(license);
const validateSmartCard = (code) => /^\d{7}$/.test(code);
// ======================================================

export function DriverLogin() {
  const { login, user } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState("login");
  const [step, setStep] = useState("phone");
  const [rememberMe, setRememberMe] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [mobile, setMobile] = useState("");
  const [code, setCode] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nationalCode, setNationalCode] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [tractorType, setTractorType] = useState("");
  const [trailerType, setTrailerType] = useState("");
  const [smartCardNumber, setSmartCardNumber] = useState("");
  const [plate, setPlate] = useState({
    part1: "",
    letter: "",
    part2: "",
    iranCode: "",
  });

  const handleError = (e, fallback) =>
    setError(e.response?.data?.message || e.response?.data?.error || fallback);

  const handleSendOtp = async () => {
    if (!validateMobile(mobile))
      return setError("شماره موبایل وارد شده نامعتبر است.");
    setLoading(true);
    setError("");
    try {
      await api.post("/auth/request-otp", { mobile });
      setStep("otp");
      setCode(FIXED_OTP_CODE);
    } catch (e) {
      handleError(e, "خطا در ارتباط با سرور");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (code.length !== 4) return setError("کد ۴ رقمی را وارد کنید.");
    setLoading(true);
    setError("");

    if (mode === "register") {
      if (code !== FIXED_OTP_CODE) {
        setError("کد وارد شده اشتباه است.");
        setLoading(false);
        return;
      }
      setStep("personal");
      setLoading(false);
      return;
    }

    try {
      const res = await api.post("/auth/verify-otp", { mobile, code });
      login(res.data.token, res.data.driver || res.data.user, rememberMe);
      navigate("/dashboard", { replace: true });
    } catch (e) {
      handleError(
        e,
        "کد اشتباه است یا حسابی یافت نشد. لطفاً تب ثبت‌نام را انتخاب کنید.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePersonalSubmit = () => {
    if (!firstName.trim()) return setError("نام الزامی است.");
    if (!lastName.trim()) return setError("نام خانوادگی الزامی است.");
    if (!validateNationalId(nationalCode))
      return setError("کد ملی وارد شده معتبر نیست.");
    if (!validateDrivingLicense(licenseNumber))
      return setError("شماره گواهینامه باید دقیقاً ۱۰ رقم باشد.");

    setError("");
    setStep("vehicle");
  };

  const handleVehicleSubmit = async () => {
    if (!tractorType) return setError("نوع کشنده را انتخاب کنید.");
    if (!trailerType) return setError("نوع گاری را انتخاب کنید.");
    if (!plate.part1 || !plate.letter || !plate.part2 || !plate.iranCode)
      return setError("پلاک خودرو را کامل وارد کنید.");
    if (!validateSmartCard(smartCardNumber))
      return setError("شماره هوشمند باید دقیقاً ۷ رقم باشد.");

    setLoading(true);
    setError("");

    try {
      const res = await api.post("/auth/register-driver", {
        mobile,
        code,
        name: `${firstName} ${lastName}`.trim(),
        nationalCode,
        licenseNumber,
        tractorType,
        trailerType,
        smartCardNumber,
        plate: `${plate.part1}-${plate.letter}-${plate.part2}-${plate.iranCode}`,
        phone_number: mobile,
        first_name: firstName,
        last_name: lastName,
        national_id: nationalCode,
        license_number: licenseNumber,
        tractor_type: tractorType,
        trailer_type: trailerType,
        smart_card_number: smartCardNumber,
      });

      const newToken = res.data?.token;
      const newUserData = res.data?.user || res.data?.driver;

      if (newToken) {
        login(newToken, newUserData, rememberMe);
      } else {
        throw new Error(
          "بک‌اند پس از ثبت‌نام توکن ورود (Token) را ارسال نکرد.",
        );
      }

      navigate("/dashboard", { replace: true });
    } catch (e) {
      setError(
        e.response?.data?.message ||
          e.response?.data?.error ||
          e.message ||
          "خطا در ثبت اطلاعات.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-slate-900 flex items-center justify-center p-4"
      dir="rtl"
    >
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 shadow-lg mb-4">
            <Truck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Xbar راننده</h1>
        </div>

        <div className="rounded-3xl bg-white shadow-2xl p-6 sm:p-8">
          {step === "phone" && (
            <div className="animate-in fade-in zoom-in-95 duration-300">
              <div className="flex bg-slate-100 p-1.5 rounded-xl mb-6">
                <button
                  onClick={() => {
                    setMode("login");
                    setError("");
                  }}
                  className={`flex-1 py-2.5 rounded-lg font-bold text-sm transition-all ${mode === "login" ? "bg-white shadow text-blue-600" : "text-slate-500"}`}
                >
                  ورود
                </button>
                <button
                  onClick={() => {
                    setMode("register");
                    setError("");
                  }}
                  className={`flex-1 py-2.5 rounded-lg font-bold text-sm transition-all ${mode === "register" ? "bg-white shadow text-blue-600" : "text-slate-500"}`}
                >
                  ثبت‌نام
                </button>
              </div>

              <div className="relative mb-4">
                <Phone className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="tel"
                  value={mobile}
                  onChange={(e) => {
                    setMobile(e.target.value);
                    setError("");
                  }}
                  placeholder="شماره موبایل (مثال: 0912...)"
                  dir="ltr"
                  maxLength={11}
                  className="w-full rounded-xl border-2 border-slate-200 py-3.5 pr-12 pl-4 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <label className="flex items-center gap-2 mb-6 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-600 font-medium">
                  مرا در این دستگاه به خاطر بسپار
                </span>
              </label>

              {error && (
                <p className="text-sm text-red-500 mb-4 text-center font-medium">
                  {error}
                </p>
              )}
              <button
                onClick={handleSendOtp}
                disabled={loading}
                className="w-full flex items-center justify-center rounded-xl bg-blue-600 py-3.5 font-bold text-white hover:bg-blue-700 disabled:opacity-60 transition-all"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "دریافت کد تأیید"
                )}
              </button>
            </div>
          )}

          {step === "otp" && (
            <div className="animate-in slide-in-from-right-4 duration-300">
              <button
                onClick={() => setStep("phone")}
                className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-6"
              >
                <ArrowRight className="w-4 h-4" /> اصلاح شماره
              </button>
              <h2 className="text-xl font-bold text-slate-800 mb-2">
                کد تأیید
              </h2>
              <p className="text-sm text-slate-500 mb-6">
                کد به{" "}
                <span dir="ltr" className="font-bold text-slate-700">
                  {mobile}
                </span>{" "}
                پیامک شد.
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
                className="w-full text-center text-3xl font-bold tracking-[0.5em] rounded-xl border-2 border-slate-200 py-4 mb-6 focus:border-green-500 focus:outline-none"
              />

              {error && (
                <p className="text-sm text-red-500 mb-4 text-center font-medium">
                  {error}
                </p>
              )}
              <button
                onClick={handleVerifyOtp}
                disabled={loading || code.length < 4}
                className="w-full flex items-center justify-center rounded-xl bg-green-600 py-3.5 font-bold text-white hover:bg-green-700 disabled:opacity-60 transition-all"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : mode === "login" ? (
                  "تأیید و ورود"
                ) : (
                  "تأیید و ادامه"
                )}
              </button>
            </div>
          )}

          {step === "personal" && (
            <div className="animate-in slide-in-from-right-4 duration-300">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                  <User size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">
                    اطلاعات شخصی
                  </h2>
                  <p className="text-xs text-slate-500">
                    مشخصات هویتی خود را وارد کنید.
                  </p>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div className="relative">
                  <User className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="نام خود را وارد کنید"
                    className="w-full rounded-xl border-2 border-slate-200 py-3 pr-12 pl-4 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div className="relative">
                  <User className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="نام خانوادگی خود را وارد کنید"
                    className="w-full rounded-xl border-2 border-slate-200 py-3 pr-12 pl-4 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div className="relative">
                  <IdCard className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="tel"
                    maxLength={10}
                    dir="ltr"
                    value={nationalCode}
                    onChange={(e) => {
                      setNationalCode(e.target.value.replace(/\D/g, ""));
                      setError("");
                    }}
                    placeholder="کد ملی (۱۰ رقم)"
                    className="w-full rounded-xl border-2 border-slate-200 py-3 pr-12 pl-4 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div className="relative">
                  <Award className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="tel"
                    maxLength={10}
                    dir="ltr"
                    value={licenseNumber}
                    onChange={(e) => {
                      setLicenseNumber(e.target.value.replace(/\D/g, ""));
                      setError("");
                    }}
                    placeholder="شماره گواهینامه (۱۰ رقم)"
                    className="w-full rounded-xl border-2 border-slate-200 py-3 pr-12 pl-4 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-500 mb-4 text-center font-medium">
                  {error}
                </p>
              )}
              <button
                onClick={handlePersonalSubmit}
                disabled={loading}
                className="w-full flex items-center justify-center rounded-xl bg-blue-600 py-3.5 font-bold text-white hover:bg-blue-700 disabled:opacity-60 transition-all"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "تأیید اطلاعات و ادامه"
                )}
              </button>
            </div>
          )}

          {step === "vehicle" && (
            <div className="animate-in slide-in-from-right-4 duration-300">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                  <Truck size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">
                    اطلاعات خودرو
                  </h2>
                  <p className="text-xs text-slate-500">
                    پروفایل خود را تکمیل کنید.
                  </p>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                {/* کشنده */}
                <div className="relative">
                  <Truck className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <select
                    value={tractorType}
                    onChange={(e) => setTractorType(e.target.value)}
                    className="w-full rounded-xl border-2 border-slate-200 py-3 pr-12 pl-4 focus:border-blue-500 focus:outline-none bg-white appearance-none cursor-pointer"
                  >
                    <option value="">نوع کشنده را انتخاب کنید</option>
                    <option value="trailer">تریلی (مفصلی)</option>
                    <option value="truck">کامیون (جفت/تک)</option>
                    <option value="pickup">وانت/نیسان</option>
                  </select>
                </div>

                {/* گاری */}
                <div className="relative">
                  <Truck className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <select
                    value={trailerType}
                    onChange={(e) => setTrailerType(e.target.value)}
                    className="w-full rounded-xl border-2 border-slate-200 py-3 pr-12 pl-4 focus:border-blue-500 focus:outline-none bg-white appearance-none cursor-pointer"
                  >
                    <option value="">نوع گاری را انتخاب کنید</option>
                    <option value="flatbed">کفی</option>
                    <option value="tent">چادری (ترانزیت)</option>
                    <option value="refrigerator">یخچالی</option>
                  </select>
                </div>

                {/* ابعاد بارگیر */}
                <div className="relative">
                  <Ruler className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="ابعاد بارگیر (نیازمند تصمیم کارفرما)"
                    disabled
                    className="w-full rounded-xl border-2 border-slate-200 py-3 pr-12 pl-4 bg-slate-50 text-slate-400 cursor-not-allowed"
                  />
                </div>

                {/* پلاک */}
                <div className="pt-2">
                  <label className="block text-xs font-bold text-slate-600 mb-2">
                    شماره پلاک خودرو
                  </label>
                  <IranianPlateInput
                    value={plate}
                    onChange={(val) => {
                      setPlate(val);
                      setError("");
                    }}
                  />
                </div>

                {/* شماره هوشمند */}
                <div className="pt-2">
                  <label className="block text-xs font-bold text-slate-600 mb-2">
                    شماره هوشمند خودرو
                  </label>
                  <div className="relative">
                    <CreditCard className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="tel"
                      maxLength={7}
                      dir="ltr"
                      value={smartCardNumber}
                      onChange={(e) => {
                        setSmartCardNumber(e.target.value.replace(/\D/g, ""));
                        setError("");
                      }}
                      placeholder="مثال: ۴۱۲۱۳۹۴"
                      className="w-full rounded-xl border-2 border-slate-200 py-3 pr-12 pl-4 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <p className="mt-2 text-[11px] text-amber-600 flex items-center gap-1 bg-amber-50 p-2 rounded-lg border border-amber-100 leading-relaxed">
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                    دقت کنید: شماره هوشمند خودروی شما باید با شماره پلاک شما
                    تطابق داشته باشد.
                  </p>
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-500 mb-4 text-center font-medium">
                  {error}
                </p>
              )}
              <button
                onClick={handleVehicleSubmit}
                disabled={loading}
                className="w-full flex items-center justify-center rounded-xl bg-green-600 py-3.5 font-bold text-white hover:bg-green-700 disabled:opacity-60 transition-all"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "تأیید اطلاعات و ورود به سایت"
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
