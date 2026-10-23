export const EDITABLE_STATUSES = ["pending_review", "price_proposed", "searching_driver"];

export const URGENCY_LABELS = {
  urgent: "فوری",
  today: "امروز",
  tomorrow: "فردا",
  scheduled: "با فرصت",
};

export const HANDLING_LABELS = {
  forklift: "لیفتراک",
  crane: "جرثقیل",
  manual: "دستی",
  ramp: "رمپ",
  other: "سایر",
};

export const TIME_RANGES = [
  { key: "08:00-12:00", label: "۸ تا ۱۲", from: "08:00", to: "12:00" },
  { key: "12:00-16:00", label: "۱۲ تا ۱۶", from: "12:00", to: "16:00" },
  { key: "16:00-20:00", label: "۱۶ تا ۲۰", from: "16:00", to: "20:00" },
  { key: "20:00-24:00", label: "۲۰ تا ۲۴", from: "20:00", to: "24:00" },
];

const RANGE_LABELS = Object.fromEntries(TIME_RANGES.map((range) => [range.key, range.label]));

export function canEditShipment(shipment) {
  return Boolean(
    shipment && !shipment.driver_id && EDITABLE_STATUSES.includes(shipment.status),
  );
}

export function formatFaNumber(value, digits = 0) {
  if (value == null || value === "") return "";
  const number = Number(value);
  if (Number.isNaN(number)) return "";
  return new Intl.NumberFormat("fa-IR", { maximumFractionDigits: digits }).format(number);
}

export function formatIsoDate(iso) {
  if (!iso) return "—";
  const [year, month, day] = String(iso).slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return "—";
  return new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(year, month - 1, day));
}

export function cargoTypeLabel(shipment) {
  if (!shipment?.cargo_type) return "—";
  if (shipment.cargo_type === "other") {
    return shipment.cargo_type_other ? `سایر (${shipment.cargo_type_other})` : "سایر";
  }
  return shipment.cargo_type;
}

export function dimensionsLabel(shipment) {
  const parts = [
    ["طول", shipment?.length_cm],
    ["عرض", shipment?.width_cm],
    ["ارتفاع", shipment?.height_cm],
  ].filter(([, value]) => value != null && value !== "" && Number(value) > 0);
  if (!parts.length) return "ثبت نشده";
  return `${parts
    .map(([name, value]) => `${name} ${formatFaNumber(Number(value) / 100, 2)}`)
    .join(" × ")} متر`;
}

export function timeWindowLabel(shipment) {
  const ranges = Array.isArray(shipment?.loading_time_ranges) ? shipment.loading_time_ranges : [];
  if (ranges.length) return ranges.map((range) => RANGE_LABELS[range] || range).join("، ");
  if (shipment?.loading_time_from && shipment?.loading_time_to) {
    return `${shipment.loading_time_from} تا ${shipment.loading_time_to}`;
  }
  return "—";
}

export function cityLine(city, zone) {
  const name = city?.name || "—";
  const extra = [zone?.name, city?.province].filter(Boolean).join(" · ");
  return extra ? `${name} — ${extra}` : name;
}

export function syncTimeBounds(rangeKeys) {
  const selected = TIME_RANGES.filter((range) => rangeKeys.includes(range.key));
  return {
    loading_time_ranges: selected.map((range) => range.key),
    loading_time_from: selected[0]?.from || "",
    loading_time_to: selected[selected.length - 1]?.to || "",
  };
}
