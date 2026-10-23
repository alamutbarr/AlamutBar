import { useRef, useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import { IranianPlateInput } from "@/driver/components/IranianPlateInput";
import {
  TRACTOR_TYPES,
  TRAILER_TYPES,
  getVehicleFields,
} from "@/driver/vehicleConfig";
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
  ChevronDown,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const FIXED_OTP_CODE = "1234";

function OtpCells({ value, onChange }) {
  const cells = useRef([]);
  const digits = Array.from({ length: 4 }, (_, index) => value[index] || "");

  const write = (next) => onChange(next.replace(/\D/g, "").slice(0, 4));

  const focusAt = (index) => {
    const field = cells.current[Math.max(0, Math.min(3, index))];
    field?.focus();
    field?.select();
  };

  return (
    <div className="grid grid-cols-4 gap-3" dir="ltr">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(node) => {
            cells.current[index] = node;
          }}
          value={digit}
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          aria-label={`رقم ${index + 1} از کد تأیید`}
          maxLength={1}
          className="h-16 w-full rounded-2xl border border-[#d8e1dc] bg-[#f7f6f0] text-center text-[1.7rem] font-bold tabular-nums text-[#17383b] outline-none transition focus:border-[#087f8c] focus:bg-white focus:ring-4 focus:ring-[#087f8c]/15"
          onChange={(event) => {
            const incoming = event.target.value.replace(/\D/g, "");
            if (!incoming) {
              write(value.slice(0, index) + value.slice(index + 1));
              return;
            }
            const next = (value.slice(0, index) + incoming + value.slice(index + 1)).replace(/\D/g, "").slice(0, 4);
            write(next);
            focusAt(index + incoming.length);
          }}
          onKeyDown={(event) => {
            if (event.key === "Backspace" && !digits[index]) {
              event.preventDefault();
              write(value.slice(0, index - 1) + value.slice(index));
              focusAt(index - 1);
            }
            if (event.key === "ArrowLeft") focusAt(index - 1);
            if (event.key === "ArrowRight") focusAt(index + 1);
          }}
          onFocus={(event) => event.target.select()}
          onPaste={(event) => {
            event.preventDefault();
            write(event.clipboardData.getData("text"));
            focusAt(3);
          }}
        />
      ))}
    </div>
  );
}

// ================= توابع اعتبارسنجی =================
const validateMobile = (mobile) =>
  /^09[0-9]\d{8}$/.test(mobile.replace(/[\s\-\(\)]/g, ""));
const faDigit = "۰۱۲۳۴۵۶۷۸۹";
const nationalIdIssue = (code) => {
  if (!/^\d{10}$/.test(code)) return "کد ملی باید دقیقاً ۱۰ رقم باشد.";
  if (/^(\d)\1{9}$/.test(code)) return "کد ملی نمی‌تواند ده رقم یکسان باشد.";
  const check = +code[9];
  const sum =
    code
      .split("")
      .slice(0, 9)
      .reduce((acc, x, i) => acc + +x * (10 - i), 0) % 11;
  const control = sum < 2 ? sum : 11 - sum;
  if (check !== control) {
    return `رقم کنترل کد ملی نادرست است. رقم آخر باید ${faDigit[control]} باشد.`;
  }
  return "";
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
  // مقادیر فیلدهای پویای خودرو (وزن/طول/عرض/ارتفاع/کف/ویژگی و ...)
  const [specs, setSpecs] = useState({});

  const handleTractorChange = (value) => {
    setTractorType(value);
    setTrailerType("");
    setSpecs({});
    setError("");
  };

  const handleTrailerChange = (value) => {
    setTrailerType(value);
    setSpecs({});
    setError("");
  };

  const handleError = (e, fallback) =>
    setError(e.response?.data?.message || e.response?.data?.error || fallback);

  const handleSendOtp = async () => {
    if (!validateMobile(mobile))
      return setError("شماره موبایل وارد شده نامعتبر است.");
    setLoading(true);
    setError("");
    try {
      await api.post("/driver-auth/request-otp", { mobile });
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
      const res = await api.post("/driver-auth/verify-otp", { mobile, code });
      login(res.data.token, res.data.driver || res.data.user, rememberMe);
      navigate("/driver/dashboard", { replace: true });
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
    const nationalIssue = nationalIdIssue(nationalCode);
    if (nationalIssue) return setError(nationalIssue);
    if (!validateDrivingLicense(licenseNumber))
      return setError("شماره گواهینامه باید دقیقاً ۱۰ رقم باشد.");

    setError("");
    setStep("plate");
  };

  const handlePlateSubmit = () => {
    if (!plate.part1 || !plate.letter || !plate.part2 || !plate.iranCode)
      return setError("پلاک خودرو را کامل وارد کنید.");
    if (!validateSmartCard(smartCardNumber))
      return setError("شماره هوشمند باید دقیقاً ۷ رقم باشد.");

    setError("");
    setStep("vehicle");
  };

  const handleVehicleSubmit = async () => {
    if (!tractorType) return setError("نوع کشنده را انتخاب کنید.");
    if (!trailerType) return setError("نوع گاری را انتخاب کنید.");

    // فقط فیلدهایی که برای انتخاب فعلی نمایش داده می‌شوند، الزامی هستند.
    const fields = getVehicleFields(tractorType, trailerType);
    for (const f of fields) {
      if (!specs[f.key]) return setError(`«${f.title}» را انتخاب کنید.`);
    }

    setLoading(true);
    setError("");

    try {
      const res = await api.post("/driver-auth/register-driver", {
        mobile,
        code,
        name: `${firstName} ${lastName}`.trim(),
        nationalCode,
        licenseNumber,
        tractorType,
        trailerType,
        smartCardNumber,
        plate: `${plate.part1}-${plate.letter}-${plate.part2}-${plate.iranCode}`,
        // فقط کلیدهایی که واقعاً انتخاب شده‌اند ارسال می‌شوند (بدون مقدار مخفی)
        vehicleSpecs: fields.reduce((acc, f) => {
          if (specs[f.key]) acc[f.key] = specs[f.key];
          return acc;
        }, {}),
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

      navigate("/driver/dashboard", { replace: true });
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
        <div className="mb-8 flex flex-col items-center text-center text-[#f7f6f0]">
          <span className="mb-3 block h-12 w-12" aria-hidden="true">
            <svg viewBox="0 0 40 40" fill="none" className="h-full w-full stroke-current" strokeWidth="1.5" strokeLinejoin="bevel">
              <path d="M5 28.5 17.5 8l7.1 11.8L30 10l5 8.7v9.8H5Z" />
              <path d="M5 28.5h30M12 21l4.6 7.5M24.4 20l5.6 8.5" />
            </svg>
          </span>
          <h1 className="text-2xl font-extrabold tracking-[0.18em]">ALAMUT</h1>
          <p className="mt-2 text-sm text-[#f7f6f0]/70">پنل راننده</p>
        </div>

        <div className="rounded-3xl bg-white shadow-2xl p-6 sm:p-8">
          {step === "phone" && (
            <form className="animate-in fade-in zoom-in-95 duration-300" onSubmit={(e) => { e.preventDefault(); handleSendOtp(); }}>
              <div className="flex bg-slate-100 p-1.5 rounded-xl mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setError("");
                  }}
                  className={`flex-1 py-2.5 rounded-lg font-bold text-sm transition-all ${mode === "login" ? "bg-white shadow text-blue-600" : "text-slate-500"}`}
                >
                  ورود
                </button>
                <button
                  type="button"
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
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center rounded-xl bg-blue-600 py-3.5 font-bold text-white hover:bg-blue-700 disabled:opacity-60 transition-all"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "دریافت کد تأیید"
                )}
              </button>
            </form>
          )}

          {step === "otp" && (
            <form className="animate-in slide-in-from-right-4 duration-300" onSubmit={(e) => { e.preventDefault(); handleVerifyOtp(); }}>
              <button
                type="button"
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

              <div className="mb-6">
                <OtpCells
                  value={code}
                  onChange={(next) => {
                    setCode(next);
                    setError("");
                  }}
                />
              </div>

              {error && (
                <p className="text-sm text-red-500 mb-4 text-center font-medium">
                  {error}
                </p>
              )}
              <button
                type="submit"
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
            </form>
          )}

          {step === "personal" && (
            <form className="animate-in slide-in-from-right-4 duration-300" onSubmit={(e) => { e.preventDefault(); handlePersonalSubmit(); }}>
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
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center rounded-xl bg-blue-600 py-3.5 font-bold text-white hover:bg-blue-700 disabled:opacity-60 transition-all"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "تأیید اطلاعات و ادامه"
                )}
              </button>
            </form>
          )}

          {step === "plate" && (
            <form className="animate-in slide-in-from-right-4 duration-300" onSubmit={(e) => { e.preventDefault(); handlePlateSubmit(); }}>
              <button
                type="button"
                onClick={() => setStep("personal")}
                className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-6"
              >
                <ArrowRight className="w-4 h-4" /> بازگشت
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                  <CreditCard size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">
                    پلاک و شماره هوشمند
                  </h2>
                  <p className="text-xs text-slate-500">
                    اطلاعات شناسایی خودرو را وارد کنید.
                  </p>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                {/* پلاک */}
                <div>
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
                <div>
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
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center rounded-xl bg-blue-600 py-3.5 font-bold text-white hover:bg-blue-700 disabled:opacity-60 transition-all"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "ادامه"
                )}
              </button>
            </form>
          )}

          {step === "vehicle" && (
            <form className="animate-in slide-in-from-right-4 duration-300" onSubmit={(e) => { e.preventDefault(); handleVehicleSubmit(); }}>
              <button
                type="button"
                onClick={() => setStep("plate")}
                className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-6"
              >
                <ArrowRight className="w-4 h-4" /> بازگشت
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                  <Truck size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">
                    نوع خودرو و مشخصات
                  </h2>
                  <p className="text-xs text-slate-500">
                    نوع کشنده و گاری را انتخاب کنید.
                  </p>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                {/* نوع کشنده */}
                <SelectField
                  title="نوع کشنده"
                  icon={Truck}
                  value={tractorType}
                  onChange={handleTractorChange}
                  options={TRACTOR_TYPES}
                />

                {/* نوع گاری */}
                <SelectField
                  title="نوع گاری"
                  icon={Truck}
                  value={trailerType}
                  onChange={handleTrailerChange}
                  options={TRAILER_TYPES[tractorType] || []}
                  disabled={!tractorType}
                />

                {/* فیلدهای پویا بر اساس انتخاب کشنده و گاری */}
                {getVehicleFields(tractorType, trailerType).map((f) => (
                  <SelectField
                    key={f.key}
                    title={f.title}
                    icon={Ruler}
                    value={specs[f.key] || ""}
                    onChange={(value) => {
                      setSpecs((prev) => ({ ...prev, [f.key]: value }));
                      setError("");
                    }}
                    options={f.options}
                  />
                ))}
              </div>

              {error && (
                <p className="text-sm text-red-500 mb-4 text-center font-medium">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center rounded-xl bg-green-600 py-3.5 font-bold text-white hover:bg-green-700 disabled:opacity-60 transition-all"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "تأیید اطلاعات و ورود به سایت"
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// فیلد انتخابی (select) با عنوان، آیکون و آیکون بازشدن منو.
// برای فیلدهای نوع کشنده، نوع گاری و فیلدهای پویای مشخصات خودرو استفاده می‌شود.
function SelectField({ title, icon: Icon, value, onChange, options, disabled }) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-600 mb-2">{title}</label>
      <div className="relative">
        <Icon className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="w-full rounded-xl border-2 border-slate-200 py-3 pr-12 pl-10 focus:border-blue-500 focus:outline-none bg-white appearance-none cursor-pointer disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
        >
          <option value="">{title} را انتخاب کنید</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
      </div>
    </div>
  );
}
