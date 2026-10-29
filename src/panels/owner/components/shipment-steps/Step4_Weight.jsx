import { useMemo } from "react";
import { Weight } from "lucide-react";
import Input from "../common/Input";
import StepHeader from "./StepHeader";
import { toEnglishDigits } from "../../utils/digits";

// تابع تبدیل عدد به حروف فارسی با پشتیبانی تا ۳ رقم اعشار (دهم، صدم، هزارم)
function numberToPersianWords(val) {
  if (val === null || val === undefined || val === "") return "";
  const num = Number(val);
  if (isNaN(num) || num <= 0) return "";

  const ones = ["", "یک", "دو", "سه", "چهار", "پنج", "شش", "هفت", "هشت", "نه"];
  const teens = [
    "ده",
    "یازده",
    "دوازده",
    "سیزده",
    "چهارده",
    "پانزده",
    "شانزده",
    "هفده",
    "هجده",
    "نوزده",
  ];
  const tens = [
    "",
    "",
    "بیست",
    "سی",
    "چهل",
    "پنجاه",
    "شصت",
    "هفتاد",
    "هشتاد",
    "نود",
  ];
  const hundreds = [
    "",
    "صد",
    "دویست",
    "سیصد",
    "چهارصد",
    "پانصد",
    "ششصد",
    "هفتصد",
    "هشتصد",
    "نهصد",
  ];

  const intToWords = (n) => {
    if (n === 0) return "صفر";
    const parts = [];
    if (n >= 1000) {
      parts.push(intToWords(Math.floor(n / 1000)) + " هزار");
      n %= 1000;
    }
    if (n >= 100) {
      parts.push(hundreds[Math.floor(n / 100)]);
      n %= 100;
    }
    if (n >= 20) {
      parts.push(tens[Math.floor(n / 10)]);
      if (n % 10 > 0) parts.push(ones[n % 10]);
    } else if (n >= 10) {
      parts.push(teens[n - 10]);
    } else if (n > 0) {
      parts.push(ones[n]);
    }
    return parts.join(" و ");
  };

  const strVal = String(val);
  const [intPartStr, decPartStrRaw] = strVal.split(".");
  const intPart = parseInt(intPartStr, 10) || 0;
  const intWords = intPart > 0 ? intToWords(intPart) : "";

  if (!decPartStrRaw || parseInt(decPartStrRaw, 10) === 0) {
    return `${intWords} تن`;
  }

  // حداکثر ۳ رقم اعشار
  const decPartStr = decPartStrRaw.slice(0, 3);
  const decVal = parseInt(decPartStr, 10);

  // حالت‌های ویژه و رایج مثل نیم
  if (decPartStr === "5" || decPartStr === "50" || decPartStr === "500") {
    return intPart === 0 ? "نیم تن" : `${intWords} و نیم تن`;
  }

  const decWords = intToWords(decVal);
  const units = { 1: "دهم", 2: "صدم", 3: "هزارم" };
  const unitWord = units[decPartStr.length] || "هزارم";

  if (intPart === 0) {
    return `${decWords} ${unitWord} تن`;
  }
  return `${intWords} و ${decWords} ${unitWord} تن`;
}

export default function Step4_Weight({ data, onChange }) {
  const currentTonValue = useMemo(() => {
    if (data.weight_ton !== undefined && data.weight_ton !== "")
      return data.weight_ton;
    if (data.weight_kg) return String(Number(data.weight_kg) / 1000);
    return "";
  }, [data.weight_ton, data.weight_kg]);

  const words = useMemo(
    () => numberToPersianWords(currentTonValue),
    [currentTonValue],
  );

  const handleChange = (e) => {
    let raw = toEnglishDigits(e.target.value).trim();
    raw = raw.replace(/[^\d.]/g, "");
    const parts = raw.split(".");

    // نگه‌داشتن ممیز و محدود کردن اعشار به حداکثر ۳ رقم
    if (parts.length > 2) {
      raw = `${parts[0]}.${parts.slice(1).join("")}`;
    }
    if (raw.includes(".")) {
      const [intP, decP] = raw.split(".");
      raw = `${intP}.${decP.slice(0, 3)}`;
    }

    if (raw === "" || raw === ".") {
      onChange("weight_ton", "");
      onChange("weight_kg", "");
      return;
    }

    onChange("weight_ton", raw);
    const tonNum = parseFloat(raw);
    if (!isNaN(tonNum)) {
      // تبدیل دقیق تن با ۳ رقم اعشار به کیلوگرم (مثلاً ۲.۵۲۵ تن = ۲۵۲۵ کیلوگرم)
      onChange("weight_kg", Math.round(tonNum * 1000));
    }
  };

  return (
    <div className="space-y-5">
      <StepHeader
        title="وزن محموله"
        description="وزن کل بار به تن، برای انتخاب خودروی مناسب استفاده می‌شود."
      />

      <Input
        label="وزن کل"
        icon={Weight}
        type="text"
        inputMode="decimal"
        className="tabular"
        value={currentTonValue}
        onChange={handleChange}
        placeholder="۱۰"
        hint="واحد: تن (مثلاً 8 یا 15.5 تن)"
        required
      />

      {words && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-sm text-amber-950 flex items-center justify-between">
          <span className="text-amber-800 font-medium">وزن به حروف:</span>
          <span className="font-semibold text-base">{words}</span>
        </div>
      )}

      <Input
        label="تعداد بسته‌ها"
        type="text"
        inputMode="numeric"
        className="tabular"
        value={data.piece_count ?? ""}
        onChange={(event) => onChange("piece_count", toEnglishDigits(event.target.value).replace(/[^\d]/g, ""))}
        placeholder="مثلاً ۱۲"
        hint="اگر بار چند بسته یا شمش جدا دارد، تعداد را بنویسید."
      />
    </div>
  );
}
