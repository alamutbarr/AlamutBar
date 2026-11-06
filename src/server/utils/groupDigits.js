function groupDigits(value) {
  if (value == null || value === '') return '';
  const num = Number(value);
  if (!Number.isFinite(num)) return '';
  const negative = num < 0;
  const [whole, fraction] = Math.abs(num).toString().split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${negative ? '-' : ''}${fraction ? `${grouped}.${fraction}` : grouped}`;
}

module.exports = { groupDigits };
