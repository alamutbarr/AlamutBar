// اعتبارسنجی کد ملی - منبع واحد Frontend (Profile + مرحله بعد از OTP)
export function isValidNationalId(code) {
  if (typeof code !== "string") return false;
  if (!/^\d{10}$/.test(code)) return false;
  if (/^(\d)\1{9}$/.test(code)) return false;
  const digits = code.split("").map(Number);
  const sum = digits.slice(0, 9).reduce((acc, d, i) => acc + d * (10 - i), 0);
  const remainder = sum % 11;
  const controlDigit = remainder < 2 ? remainder : 11 - remainder;
  return controlDigit === digits[9];
}
