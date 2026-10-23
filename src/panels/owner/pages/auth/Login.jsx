import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Phone, KeyRound, User, Building2, ArrowLeft } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import AuthShell from "./AuthShell";
import { getErrorMessage } from "../../utils/errorMessage";
import { toEnglishDigits } from "../../utils/digits";
import { isValidNationalId } from "../../utils/nationalId";

const RESEND_COOLDOWN = 60;

export default function Login() {
  const [step, setStep] = useState("phone"); // phone | otp | profile
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [profile, setProfile] = useState({
    first_name: "",
    last_name: "",
    company_name: "",
    national_id: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [devOtp, setDevOtp] = useState("");

  const { sendOtp, confirmOtp } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await sendOtp(phone);
      setStep("otp");
      setCooldown(RESEND_COOLDOWN);
      if (result?.devOtpCode) {
        setDevOtp(result.devOtpCode);
        setOtp(result.devOtpCode);
      } else {
        setDevOtp("");
      }
    } catch (err) {
      setError(getErrorMessage(err, "ارسال کد با خطا مواجه شد."));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e, profileOverride) => {
    e?.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await confirmOtp(phone, otp, profileOverride || profile);
      if (isValidNationalId(data?.user?.national_id)) {
        navigate("/owner/dashboard");
      } else {
        navigate("/owner/complete-national-id"); // اجباری: بدون کد ملی معتبر ادامه داده نمی‌شود
      }
    } catch (err) {
      const code = err.response?.data?.code;
      if (code === "PROFILE_REQUIRED" || code === "NATIONAL_ID_REQUIRED") {
        setStep("profile");
      } else {
        setError(getErrorMessage(err, "کد وارد شده نادرست است."));
      }
    } finally {
      setLoading(false);
    }
  };

  const stepMeta = {
    phone: {
      title: "خوش اومدی",
      subtitle: "شماره موبایلت رو وارد کن تا کد تأیید برات پیامک بشه.",
    },
    otp: {
      title: "کد تأیید رو وارد کن",
      subtitle: `کد ۵ رقمی به شماره ${phone} پیامک شد.`,
    },
    profile: {
      title: "یه قدم تا شروع",
      subtitle: "برای اولین‌بار خوش اومدی! این چند تا فیلد رو هم پر کن.",
    },
  };

  return (
    <AuthShell title={stepMeta[step].title} subtitle={stepMeta[step].subtitle}>
      {error && (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {error}
        </div>
      )}

      {step === "phone" && (
        <motion.div
          key="phone"
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.22 }}
        >
          <form onSubmit={handleSendOtp} className="space-y-4">
            <Input
              label="شماره موبایل"
              icon={Phone}
              type="tel"
              dir="ltr"
              className="text-left tabular"
              placeholder="0912xxxxxxx"
              value={phone}
              onChange={(e) =>
                setPhone(toEnglishDigits(e.target.value).replace(/[^\d]/g, ""))
              }
              autoFocus
              required
            />
            <Button
              type="submit"
              variant="accent"
              size="lg"
              loading={loading}
              className="w-full"
            >
              دریافت کد تأیید
            </Button>
          </form>
        </motion.div>
      )}

      {step === "otp" && (
        <motion.div
          key="otp"
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.22 }}
        >
          <form onSubmit={handleVerify} className="space-y-4">
            {devOtp && (
              <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50 px-4 py-2.5 text-xs text-amber-700">
                🛠️ حالت توسعه (بدون درگاه پیامک واقعی) — کد به‌صورت خودکار پر
                شد: <span className="tabular font-bold">{devOtp}</span>
              </div>
            )}
            <Input
              label="کد تأیید"
              icon={KeyRound}
              dir="ltr"
              className="tabular text-center text-lg tracking-[0.5em]"
              maxLength={5}
              value={otp}
              onChange={(e) =>
                setOtp(toEnglishDigits(e.target.value).replace(/[^\d]/g, ""))
              }
              placeholder="•••••"
              autoFocus
              required
            />
            <Button
              type="submit"
              variant="accent"
              size="lg"
              loading={loading}
              className="w-full"
            >
              تأیید و ورود
            </Button>
            <div className="flex items-center justify-between text-xs text-ink-300">
              <button
                type="button"
                onClick={() => setStep("phone")}
                className="inline-flex items-center gap-1 hover:text-ink-700"
              >
                <ArrowLeft size={13} />
                اصلاح شماره موبایل
              </button>
              <button
                type="button"
                disabled={cooldown > 0}
                onClick={handleSendOtp}
                className="tabular disabled:text-ink-200"
              >
                {cooldown > 0
                  ? `ارسال مجدد تا ${cooldown} ثانیه`
                  : "ارسال مجدد کد"}
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {step === "profile" && (
        <motion.div
          key="profile"
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.22 }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleVerify(null, profile);
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="نام"
                icon={User}
                value={profile.first_name}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, first_name: e.target.value }))
                }
                required
              />
              <Input
                label="نام خانوادگی"
                value={profile.last_name}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, last_name: e.target.value }))
                }
                required
              />
            </div>
            <Input
              label="نام شرکت (اختیاری)"
              icon={Building2}
              value={profile.company_name}
              onChange={(e) =>
                setProfile((p) => ({ ...p, company_name: e.target.value }))
              }
            />
            <Input
              label="کد ملی"
              dir="ltr"
              className="tabular text-left"
              maxLength={10}
              inputMode="numeric"
              value={profile.national_id}
              onChange={(e) =>
                setProfile((p) => ({
                  ...p,
                  national_id: toEnglishDigits(e.target.value)
                    .replace(/[^\d]/g, "")
                    .slice(0, 10),
                }))
              }
              placeholder="0499370899"
              required
            />
            <Button
              type="submit"
              variant="accent"
              size="lg"
              loading={loading}
              className="w-full"
            >
              تکمیل ثبت‌نام و ورود
            </Button>
          </form>
        </motion.div>
      )}
    </AuthShell>
  );
}
