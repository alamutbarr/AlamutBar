import { useEffect, useState } from "react";
import api from "../../api/axios.config";

// عکس‌ها از ریشه‌ی سرور (بدون /api) سرو می‌شوند
const API_ORIGIN = api.defaults.baseURL.replace(/\/api\/?$/, "");

// نام‌ها در سیستم معمولاً فارسی ذخیره می‌شوند؛ برای آواتار حرف اول به معادل انگلیسی تبدیل می‌شود
const FA_TO_EN = {
  ا: "A",
  آ: "A",
  ء: "A",
  ع: "A",
  ب: "B",
  پ: "P",
  ت: "T",
  ث: "S",
  ج: "J",
  چ: "C",
  ح: "H",
  ه: "H",
  خ: "K",
  ک: "K",
  ك: "K",
  د: "D",
  ذ: "Z",
  ز: "Z",
  ض: "Z",
  ظ: "Z",
  ژ: "Z",
  ر: "R",
  س: "S",
  ش: "S",
  ص: "S",
  ط: "T",
  غ: "G",
  گ: "G",
  ف: "F",
  ق: "Q",
  ل: "L",
  م: "M",
  ن: "N",
  و: "V",
  ی: "Y",
  ي: "Y",
  ئ: "E",
};

function initialOf(name) {
  const ch = (name || "").trim().charAt(0);
  if (!ch) return "";
  if (/[a-z]/i.test(ch)) return ch.toUpperCase();
  return FA_TO_EN[ch] || "";
}

const SIZES = {
  sm: {
    box: "h-8 w-8 text-xs",
    img: "",
    fallback: "bg-amber-500/20 text-amber-400",
  },
  lg: {
    box: "h-24 w-24 text-3xl",
    img: "shadow-panel ring-2 ring-white",
    fallback: "bg-amber-gradient text-ink-950 shadow-glow",
  },
};

// آواتار کاربر: اگر عکس باشد عکس، وگرنه حروف اول نام و نام خانوادگی (انگلیسی).
// هم منوی کناری و هم صفحه‌ی پروفایل از همین کامپوننت و از همان user در AuthContext استفاده می‌کنند.
export default function Avatar({
  avatarUrl,
  firstName,
  lastName,
  size = "sm",
}) {
  const s = SIZES[size];
  const src = avatarUrl ? `${API_ORIGIN}${avatarUrl}` : "";
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [src]);

  if (src && !failed) {
    return (
      <img
        src={src}
        alt="عکس پروفایل"
        onError={() => setFailed(true)}
        className={`${s.box} ${s.img} shrink-0 rounded-full object-cover`}
      />
    );
  }

  const initials = `${initialOf(firstName)}${initialOf(lastName)}`;
  return (
    <span
      dir="ltr"
      className={`tabular ${s.box} ${s.fallback} flex shrink-0 items-center justify-center rounded-full font-bold`}
    >
      {initials || "?"}
    </span>
  );
}
