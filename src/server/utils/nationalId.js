const faDigit = "۰۱۲۳۴۵۶۷۸۹";

// رقم کنترل کد ملی: ضریب ۱۰ تا ۲ روی نه رقم اول، باقی‌مانده بر ۱۱
function nationalIdIssue(code) {
  if (typeof code !== "string" || !/^\d{10}$/.test(code)) {
    return "کد ملی باید دقیقاً ۱۰ رقم باشد.";
  }
  if (/^(\d)\1{9}$/.test(code)) {
    return "کد ملی نمی‌تواند ده رقم یکسان باشد.";
  }
  const digits = code.split("").map(Number);
  const sum = digits.slice(0, 9).reduce((acc, d, i) => acc + d * (10 - i), 0);
  const remainder = sum % 11;
  const controlDigit = remainder < 2 ? remainder : 11 - remainder;
  if (controlDigit !== digits[9]) {
    return `رقم کنترل کد ملی نادرست است. رقم آخر باید ${faDigit[controlDigit]} باشد.`;
  }
  return "";
}

function isValidNationalId(code) {
  return nationalIdIssue(code) === "";
}

module.exports = { isValidNationalId, nationalIdIssue };
