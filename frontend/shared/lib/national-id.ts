export function nationalIdOk(value: string | undefined) {
  const digits = (value || "")
    .replace(/[۰-۹]/g, (char) => String(char.charCodeAt(0) - 1776))
    .replace(/[٠-٩]/g, (char) => String(char.charCodeAt(0) - 1632));
  if (!/^\d{10}$/.test(digits) || new Set(digits).size === 1) return false;
  const rest = [...digits.slice(0, 9)].reduce(
    (sum, digit, index) => sum + Number(digit) * (10 - index),
    0,
  ) % 11;
  return Number(digits[9]) === (rest < 2 ? rest : 11 - rest);
}
