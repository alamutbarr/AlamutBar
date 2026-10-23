// کد ملی: فقط ۱۰ رقم. رقم کنترل چک نمی‌شود.
function nationalIdIssue(code) {
  if (typeof code !== "string" || !/^\d{10}$/.test(code)) {
    return "کد ملی باید دقیقاً ۱۰ رقم باشد.";
  }
  return "";
}

function isValidNationalId(code) {
  return nationalIdIssue(code) === "";
}

module.exports = { isValidNationalId, nationalIdIssue };
