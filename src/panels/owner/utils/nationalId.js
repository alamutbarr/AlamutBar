// کد ملی: فقط ۱۰ رقم. رقم کنترل چک نمی‌شود.
export function nationalIdIssue(code) {
  if (typeof code !== "string" || !/^\d{10}$/.test(code)) {
    return "کد ملی باید دقیقاً ۱۰ رقم باشد.";
  }
  return "";
}

export function isValidNationalId(code) {
  return nationalIdIssue(code) === "";
}
