// تبدیل ارقام فارسی/عربی به انگلیسی - چون input های عددی HTML و parseInt/parseFloat
// جاوااسکریپت اصلاً ارقام فارسی (۰۱۲۳...) یا عربی (٠١٢٣...) را عدد تشخیص نمی‌دهند
const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

export function toEnglishDigits(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[۰-۹٠-٩]/g, (ch) => {
    const persianIndex = PERSIAN_DIGITS.indexOf(ch);
    if (persianIndex > -1) return String(persianIndex);
    const arabicIndex = ARABIC_DIGITS.indexOf(ch);
    if (arabicIndex > -1) return String(arabicIndex);
    return ch;
  });
}

// هر ورودی کاربر (حتی با ارقام فارسی، فاصله، یا کاراکتر اضافه) را به عدد امن تبدیل می‌کند
// و هیچ‌وقت NaN برنمی‌گرداند - یا عدد معتبر یا رشته‌ی خالی (که یعنی «هنوز عددی وارد نشده»)
export function parseNumberInput(rawValue, { allowDecimal = true, allowNegative = false } = {}) {
  let normalized = toEnglishDigits(rawValue).trim();
  const allowedChars = allowDecimal ? /[^\d.]/g : /[^\d]/g;
  normalized = normalized.replace(allowedChars, '');
  if (allowNegative && String(rawValue).trim().startsWith('-')) {
    normalized = `-${normalized}`;
  }
  if (normalized === '' || normalized === '-' || normalized === '.') return '';
  const num = Number(normalized);
  return Number.isNaN(num) ? '' : num;
}
