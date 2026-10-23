import { useState, useEffect } from "react";
import Input from "../common/Input";
import StepHeader from "./StepHeader";
import { toEnglishDigits } from "../../utils/digits";

// تبدیل ورودی متنی متر به سانتی‌متر عدد صحیح برای ذخیره در state/backend
function meterToCm(valStr) {
  if (valStr === null || valStr === undefined) return "";
  const cleaned = toEnglishDigits(String(valStr))
    .trim()
    .replace(/[^\d.]/g, "");

  if (cleaned === "" || cleaned === ".") return "";
  const num = Number(cleaned);
  if (Number.isNaN(num) || num <= 0) return "";
  return Math.round(num * 100);
}

// تبدیل سانتی‌متر موجود در state به رشته متر برای نمایش در اینپوت
function cmToMeter(cmVal) {
  if (cmVal === null || cmVal === undefined || cmVal === "") return "";
  const num = Number(cmVal);
  if (Number.isNaN(num) || num <= 0) return "";
  return String(num / 100);
}

export default function Step5_Dimensions({ data, onChange }) {
  // نگهداری مقدار متنی کاربر برای حفظ حالت تایپ اعشار (مثل تایپ ممیز ".")
  const [localMeters, setLocalMeters] = useState({
    length: cmToMeter(data.length_cm),
    width: cmToMeter(data.width_cm),
    height: cmToMeter(data.height_cm),
  });

  // همگام‌سازی در صورت تغییر مقدار از بیرون (مثلاً رفت‌وبرگشت بین مراحل)
  useEffect(() => {
    setLocalMeters({
      length: cmToMeter(data.length_cm),
      width: cmToMeter(data.width_cm),
      height: cmToMeter(data.height_cm),
    });
  }, [data.length_cm, data.width_cm, data.height_cm]);

  const handleFieldChange = (fieldKey, stateKey, rawValue) => {
    // پذیرش ارقام انگلیسی، فارسی و ممیز اعشار
    const normalized = toEnglishDigits(rawValue).replace(/[^\d.]/g, "");

    // جلوگیری از ثبت بیش از یک ممیز اعشار
    const parts = normalized.split(".");
    const cleanValue =
      parts.length > 2 ? `${parts[0]}.${parts.slice(1).join("")}` : normalized;

    setLocalMeters((prev) => ({ ...prev, [fieldKey]: cleanValue }));

    const cmValue = meterToCm(cleanValue);
    onChange(stateKey, cmValue);
  };

  return (
    <div className="space-y-5">
      <StepHeader
        title="ابعاد بار (اختیاری)"
        description="وارد کردن ابعاد به تطبیق دقیق‌تر خودروی مناسب کمک می‌کند."
      />
      <div className="grid grid-cols-3 gap-3">
        <Input
          label="طول (متر)"
          type="text"
          inputMode="decimal"
          className="tabular"
          placeholder="مثلاً 12"
          value={localMeters.length}
          onChange={(e) =>
            handleFieldChange("length", "length_cm", e.target.value)
          }
        />
        <Input
          label="عرض (متر)"
          type="text"
          inputMode="decimal"
          className="tabular"
          placeholder="مثلاً 2.5"
          value={localMeters.width}
          onChange={(e) =>
            handleFieldChange("width", "width_cm", e.target.value)
          }
        />
        <Input
          label="ارتفاع (متر)"
          type="text"
          inputMode="decimal"
          className="tabular"
          placeholder="مثلاً 3"
          value={localMeters.height}
          onChange={(e) =>
            handleFieldChange("height", "height_cm", e.target.value)
          }
        />
      </div>
    </div>
  );
}
