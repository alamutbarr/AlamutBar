/**
 * تبدیل عدد صحیح تومان به حروف فارسی
 */
export function numberToWordsFa(num) {
  if (num === 0) return "صفر";
  if (!num || isNaN(num) || num < 0) return "";

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
    "یکصد",
    "دویست",
    "سیصد",
    "چهارصد",
    "پانصد",
    "ششصد",
    "هفتصد",
    "هشتصد",
    "نهصد",
  ];
  const scales = ["", "هزار", "میلیون", "میلیارد", "تریلیون"];

  function convertGroup(n) {
    const parts = [];
    const h = Math.floor(n / 100);
    const rem = n % 100;
    if (h > 0) {
      parts.push(h === 1 ? "صد" : hundreds[h]);
    }
    if (rem >= 10 && rem < 20) {
      parts.push(teens[rem - 10]);
    } else {
      const t = Math.floor(rem / 10);
      const o = rem % 10;
      if (t > 0) parts.push(tens[t]);
      if (o > 0) parts.push(ones[o]);
    }
    return parts.join(" و ");
  }

  const groups = [];
  let temp = BigInt(Math.floor(num));
  if (temp === 0n) return "صفر";

  while (temp > 0n) {
    groups.push(Number(temp % 1000n));
    temp = temp / 1000n;
  }

  const words = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    const val = groups[i];
    if (val > 0) {
      const gText = convertGroup(val);
      if (i > 0) {
        if (i === 1 && val === 1 && groups.length === 2) {
          words.push("هزار");
        } else {
          words.push(gText + " " + scales[i]);
        }
      } else {
        words.push(gText);
      }
    }
  }

  return words.join(" و ");
}

/**
 * دریافت مقدار ریال و بازگرداندن متن تومان به حروف فارسی
 */
export function rialToTomanWords(rialValue) {
  if (!rialValue || isNaN(rialValue) || Number(rialValue) <= 0) return "";
  const toman = Math.floor(Number(rialValue) / 10);
  if (toman === 0) return "کمتر از یک تومان";
  const words = numberToWordsFa(toman);
  return words ? `${words} تومان` : "";
}

// ===== این تابع رو اضافه کردم تا ارور Dashboard رفع بشه =====
/**
 * دریافت مقدار تومان و بازگرداندن متن به حروف فارسی
 */
export function formatToman(tomanValue) {
  if (!tomanValue || isNaN(tomanValue) || Number(tomanValue) <= 0) return "";
  const words = numberToWordsFa(Math.floor(Number(tomanValue)));
  return words ? `${words} تومان` : "";
}

export function formatRialAsTomanAmount(rialValue) {
  const toman = Math.floor(Number(rialValue) / 10);
  if (!Number.isFinite(toman) || toman <= 0) return "";
  return String(toman).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
