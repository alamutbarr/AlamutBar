import { useRef } from "react";
import { ShieldCheck, Info } from "lucide-react";
import Input from "../common/Input";
import StepHeader from "./StepHeader";
import { toEnglishDigits } from "../../utils/digits";
import { rialToTomanWords } from "../../utils/currency.util";

// فرمت سه‌رقمی عدد با کاما
function formatWithCommas(val) {
  if (val === null || val === undefined || val === "") return "";
  const clean = String(val).replace(/[^\d]/g, "");
  return clean.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export default function Step6_Insurance({ data, onChange }) {
  const inputRef = useRef(null);

  const rawRial = data.cargo_value ?? "";
  const displayValue = formatWithCommas(rawRial);
  const tomanWords = rialToTomanWords(rawRial);

  const handleInputChange = (e) => {
    const inputEl = e.target;
    const rawVal = inputEl.value;
    const oldCursorPos = inputEl.selectionStart || 0;

    // شمارش ارقام پیش از مکان‌نما برای بازگردانی دقیق Cursor پس از درج کاما
    const digitsBeforeCursor = toEnglishDigits(
      rawVal.slice(0, oldCursorPos),
    ).replace(/[^\d]/g, "").length;

    // استخراج رقم‌های خالص ریالی
    const cleanDigits = toEnglishDigits(rawVal).replace(/[^\d]/g, "");

    if (cleanDigits === "") {
      onChange("cargo_value", "");
      return;
    }

    const numericValue = Number(cleanDigits);
    onChange("cargo_value", numericValue);

    // تنظیم مجدد مکان‌نما
    requestAnimationFrame(() => {
      if (!inputEl) return;
      const formatted = formatWithCommas(cleanDigits);
      let newCursorPos = 0;
      let digitCount = 0;

      for (let i = 0; i < formatted.length; i++) {
        if (formatted[i] !== ",") {
          digitCount++;
        }
        if (digitCount === digitsBeforeCursor) {
          newCursorPos = i + 1;
          break;
        }
      }

      if (digitCount < digitsBeforeCursor) {
        newCursorPos = formatted.length;
      }

      inputEl.setSelectionRange(newCursorPos, newCursorPos);
    });
  };

  return (
    <div className="space-y-5">
      <StepHeader
        title="ارزش اعلامی کالا"
        description="این مبلغ مبنای محاسبه‌ی بیمه‌ی بار در طول مسیر حمل خواهد بود."
      />

      <div className="space-y-3">
        <Input
          ref={inputRef}
          label="ارزش کل محموله (ریال)"
          icon={ShieldCheck}
          type="text"
          inputMode="numeric"
          className="tabular text-left dir-ltr"
          value={displayValue}
          onChange={handleInputChange}
          placeholder="مثلاً ۵۰,۰۰۰,۰۰۰"
          required
        />

        {/* کادر تبدیل داینامیک به حروف تومان (در صورت ورود مقدار) */}
        {tomanWords && (
          <div className="rounded-lg border border-amber-200/60 bg-amber-50/50 p-3 text-sm">
            <div className="flex items-center justify-between text-xs text-ink-500 mb-1">
              <span>معادل به تومان:</span>
              <span className="font-semibold text-ink-700 tabular">
                {formatWithCommas(Math.floor(Number(rawRial) / 10))} تومان
              </span>
            </div>
            <div className="font-medium text-amber-900 leading-relaxed">
              {tomanWords}
            </div>
          </div>
        )}

        {/* متن ثابت راهنمای حداقل ارزش محموله */}
        <div className="flex items-center gap-1.5 pt-1 text-xs text-ink-500">
          <Info size={14} className="text-amber-600 shrink-0" />
          <span>حداقل ارزش محموله: ۱۰ میلیون تومان</span>
        </div>
      </div>
    </div>
  );
}
