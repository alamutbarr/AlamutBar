export function isValidIranNationalId(value) {
  if (value === "") return true; // اختیاری

  if (!/^\d{10}$/.test(value)) return false;
  if (/^(\d)\1{9}$/.test(value)) return false;

  const sum = value
    .slice(0, 9)
    .split("")
    .reduce((total, digit, index) => total + Number(digit) * (10 - index), 0);

  const remainder = sum % 11;
  const checkDigit = remainder < 2 ? remainder : 11 - remainder;

  return checkDigit === Number(value[9]);
}

export function isValidIranPostalCode(value) {
  if (value === "") return true; // اختیاری

  if (!/^\d{10}$/.test(value)) return false;
  if (/^(\d)\1{9}$/.test(value)) return false;
  if (/[02]/.test(value.slice(0, 5))) return false;
  if (value[4] === "5") return false;
  if (/^(\d)\1{3}$/.test(value.slice(0, 4))) return false;

  return true;
}
