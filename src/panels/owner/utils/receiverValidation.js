export function isValidIranNationalId(value) {
  if (value === "") return true;
  return /^\d{10}$/.test(value);
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
