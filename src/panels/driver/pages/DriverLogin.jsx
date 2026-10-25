import { useRef, useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import { IranianPlateInput } from "@/components/IranianPlateInput";
import { getVehicleFields } from "@/vehicleConfig";
import { VehicleWizard } from "@/components/VehicleWizard";
import {
  Phone,
  Loader2,
  User,
  CreditCard,
  ArrowRight,
  ShieldCheck,
  IdCard,
  Award,
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
          className="h-16 w-full rounded-md border border-[#d8e1dc] bg-white text-center text-[1.7rem] font-bold tabular-nums text-[#17383b] outline-none transition focus:border-[#087f8c] focus:ring-2 focus:ring-[#087f8c]/30"
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
const nationalIdIssue = (code) =>
  /^\d{10}$/.test(code) ? "" : "کد ملی باید دقیقاً ۱۰ رقم باشد.";
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
    <div className="min-h-screen bg-[#f7f6f0]" dir="rtl">
      <header className="bg-[#10282b] px-4 py-3 text-[#f7f6f0] lg:hidden">
        <p className="text-[11px] font-medium text-[#d7b56d]">حمل بار، با خیال راحت</p>
        <p className="text-sm font-extrabold tracking-[0.16em]">ALAMUT</p>
      </header>
      <div className="grid min-h-[calc(100vh-64px)] lg:min-h-screen lg:grid-cols-2">
        <aside className="brand-rail hidden flex-col justify-between p-12 lg:flex">
          <div>
            <p className="text-[15px] font-extrabold tracking-[0.18em]">ALAMUT</p>
            <p className="mt-1 text-[11px] text-[#f7f6f0]/70">حمل‌ونقل و لجستیک</p>
          </div>
          <div className="max-w-sm">
            <p className="text-[11px] font-medium text-[#d7b56d]">حمل بار، با خیال راحت</p>
            <p className="mt-3 text-3xl font-bold leading-snug text-[#f7f6f0]">
              مسیر مطمئن،
              <span className="mt-1 block text-[#159a9c]">حمل هوشمند.</span>
            </p>
            <p className="mt-4 text-sm leading-8 text-[#f7f6f0]/75">مأموریت را بپذیر، وضعیت را به‌روز کن و تحویل را با کد یک‌بارمصرف ببند.</p>
          </div>
          <div className="glass-card flex gap-8 px-5 py-4 text-sm text-[#f7f6f0]/75">
            <div>
              <p className="text-xl font-bold text-white">۲۴/۷</p>
              <p className="text-xs">پشتیبانی مأموریت</p>
            </div>
          </div>
        </aside>
        <div className="flex items-start justify-center overflow-y-auto px-6 py-12">
          <div className="w-full max-w-lg">
          {step === "phone" && (
            <form className="animate-in fade-in zoom-in-95 duration-300" onSubmit={(e) => { e.preventDefault(); handleSendOtp(); }}>
              <h1 className="text-2xl font-bold text-[#17383b]">خوش اومدی</h1>
              <p className="mt-1.5 mb-8 text-sm text-[#7d9394]">شماره موبایل را وارد کن تا کد تأیید بیاید.</p>
              <div className="flex bg-[#eef2f0] p-1 rounded-md mb-6">
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
                  className="w-full rounded-md border border-[#d8e1dc] bg-white py-3.5 pr-12 pl-4 focus:border-blue-500 focus:outline-none"
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
                className="w-full flex items-center justify-center rounded-md bg-[#087f8c] py-3.5 font-bold text-[#f7f6f0] hover:bg-[#10282b] disabled:opacity-60 transition-all"
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
                className="w-full flex items-center justify-center rounded-md bg-[#087f8c] py-3.5 font-bold text-[#f7f6f0] hover:bg-[#10282b] disabled:opacity-60 transition-all"
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
                    className="w-full rounded-md border border-[#d8e1dc] bg-white py-3 pr-12 pl-4 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div className="relative">
                  <User className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="نام خانوادگی خود را وارد کنید"
                    className="w-full rounded-md border border-[#d8e1dc] bg-white py-3 pr-12 pl-4 focus:border-blue-500 focus:outline-none"
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
                    className="w-full rounded-md border border-[#d8e1dc] bg-white py-3 pr-12 pl-4 focus:border-blue-500 focus:outline-none"
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
                    className="w-full rounded-md border border-[#d8e1dc] bg-white py-3 pr-12 pl-4 focus:border-blue-500 focus:outline-none"
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
                className="w-full flex items-center justify-center rounded-md bg-[#087f8c] py-3.5 font-bold text-[#f7f6f0] hover:bg-[#10282b] disabled:opacity-60 transition-all"
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
                      className="w-full rounded-md border border-[#d8e1dc] bg-white py-3 pr-12 pl-4 focus:border-blue-500 focus:outline-none"
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
                className="w-full flex items-center justify-center rounded-md bg-[#087f8c] py-3.5 font-bold text-[#f7f6f0] hover:bg-[#10282b] disabled:opacity-60 transition-all"
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
            <VehicleWizard
              tractorType={tractorType}
              trailerType={trailerType}
              specs={specs}
              onTractor={handleTractorChange}
              onTrailer={handleTrailerChange}
              onSpec={(key, value) => {
                setSpecs((prev) => ({ ...prev, [key]: value }));
                setError("");
              }}
              onBack={() => setStep("plate")}
              onConfirm={handleVehicleSubmit}
              loading={loading}
              error={error}
            />
          )}
          </div>
        </div>
      </div>
    </div>
  );
}

