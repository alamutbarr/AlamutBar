import { useEffect, useMemo, useState } from "react";
import Input from "../common/Input";
import SearchableSelect from "../common/SearchableSelect";
import JalaliDatePicker from "../common/JalaliDatePicker";
import { getCities, getZonesByCity } from "../../api/location.api";
import { getVehicleTypes } from "../../api/shipment.api";
import { cityOptionKey, mergeCityCatalog } from "../../data/mergeCities";
import { IRAN_CITIES } from "../../data/iranCities";
import CARGO_TYPES from "../../../../shared/cargoTypes.json";
import { toEnglishDigits } from "../../utils/digits";
import {
  HANDLING_LABELS,
  TIME_RANGES,
  URGENCY_LABELS,
  syncTimeBounds,
} from "../../utils/shipmentPresent";

const TEHRAN_ZONES = [
  { id: 1, name: "مرکز، شمال و بافت متراکم" },
  { id: 2, name: "غرب و شمال غرب" },
  { id: 3, name: "غرب مرکزی و جنوب غرب صنعتی" },
  { id: 4, name: "شرق و شمال شرق" },
  { id: 5, name: "جنوب و جنوب شرق" },
];

const cargoOptions = [
  ...CARGO_TYPES.filter((name) => name !== "سایر").map((name) => ({ value: name, label: name })),
  { value: "other", label: "سایر" },
];

const VEHICLE_VARIANTS = {
  khavar911: ["روباز", "بغل بازشو", "مسقف", "مسقف اتاق بزرگ", "کمپرسی", "یخچال‌دار"],
  single: ["روباز", "بغل بازشو", "مسقف", "کمپرسی", "یخچال‌دار"],
  double: ["روباز", "بغل بازشو", "مسقف", "کمپرسی", "یخچال‌دار"],
  flatbed: ["کفی", "نیم لبه", "لبه‌دار", "ترانزیت چادری", "کمپرسی", "تیغه (کانتینربر)", "کانتینر", "یخچال‌دار", "کمرشکن", "بوژی"],
};

function vehicleCategory(title = "") {
  const normalized = title.replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));
  if (normalized.includes("خاور") || normalized.includes("911")) return "khavar911";
  if (normalized.includes("کامیون تک")) return "single";
  if (normalized.includes("کامیون جفت")) return "double";
  if (normalized.includes("تریلی")) return "flatbed";
  return null;
}

function cmToMeter(cmVal) {
  if (cmVal == null || cmVal === "") return "";
  const num = Number(cmVal);
  if (Number.isNaN(num) || num <= 0) return "";
  return String(num / 100);
}

function meterToCm(valStr) {
  const cleaned = toEnglishDigits(String(valStr || "")).trim().replace(/[^\d.]/g, "");
  if (!cleaned || cleaned === ".") return "";
  const num = Number(cleaned);
  if (Number.isNaN(num) || num <= 0) return "";
  return Math.round(num * 100);
}

function cityOptions(cities) {
  return cities.map((city) => ({
    value: city.id,
    key: cityOptionKey(city),
    label: city.name,
    subLabel: city.province ? `استان ${city.province}` : undefined,
    searchKey: `${city.name || ""} ${city.province || ""}`,
  }));
}

export function shipmentToForm(shipment) {
  return {
    origin_city_id: shipment.origin_city_id || "",
    origin_city_name: shipment.originCity?.name?.trim() || "",
    origin_zone_id: shipment.origin_zone_id || "",
    origin_address: shipment.origin_address || "",
    origin_lat: shipment.origin_lat,
    origin_lng: shipment.origin_lng,
    dest_city_id: shipment.dest_city_id || "",
    dest_zone_id: shipment.dest_zone_id || "",
    dest_address: shipment.dest_address || "",
    dest_lat: shipment.dest_lat ?? "",
    dest_lng: shipment.dest_lng ?? "",
    cargo_type: shipment.cargo_type || "",
    cargo_type_other: shipment.cargo_type_other || "",
    packaging_type: shipment.packaging_type || "",
    weight_kg: shipment.weight_kg ?? "",
    length_cm: shipment.length_cm ?? "",
    width_cm: shipment.width_cm ?? "",
    height_cm: shipment.height_cm ?? "",
    cargo_value: shipment.cargo_value ?? "",
    notes: shipment.notes || "",
    loading_date: shipment.loading_date ? String(shipment.loading_date).slice(0, 10) : "",
    loading_time_from: shipment.loading_time_from || "",
    loading_time_to: shipment.loading_time_to || "",
    loading_time_ranges: Array.isArray(shipment.loading_time_ranges) ? shipment.loading_time_ranges : [],
    urgency: shipment.urgency || "scheduled",
    vehicle_type_id: shipment.vehicle_type_id || "",
    vehicle_variants: Array.isArray(shipment.vehicle_variants) ? shipment.vehicle_variants : [],
    loading_method: shipment.loading_method || "",
    receiver_name: shipment.receiver_name || "",
    receiver_phone: shipment.receiver_phone || "",
    receiver_national_id: shipment.receiver_national_id || "",
    receiver_postal_code: shipment.receiver_postal_code || "",
    proposed_price: shipment.proposed_price ?? "",
    photo_urls: Array.isArray(shipment.photo_urls) ? shipment.photo_urls : [],
  };
}

export function formToPayload(form) {
  const blankToNull = (value) => (value === "" || value == null ? null : Number(value));
  const { origin_city_name, ...rest } = form;
  return {
    ...rest,
    origin_city_id: Number(form.origin_city_id),
    origin_zone_id: form.origin_zone_id ? Number(form.origin_zone_id) : null,
    origin_lat: Number(form.origin_lat),
    origin_lng: Number(form.origin_lng),
    dest_city_id: Number(form.dest_city_id),
    dest_zone_id: form.dest_zone_id ? Number(form.dest_zone_id) : null,
    dest_lat: form.dest_lat === "" || form.dest_lat == null ? null : Number(form.dest_lat),
    dest_lng: form.dest_lng === "" || form.dest_lng == null ? null : Number(form.dest_lng),
    weight_kg: Number(form.weight_kg),
    length_cm: blankToNull(form.length_cm),
    width_cm: blankToNull(form.width_cm),
    height_cm: blankToNull(form.height_cm),
    cargo_value: Number(form.cargo_value),
    proposed_price: Number(form.proposed_price),
    vehicle_type_id: Number(form.vehicle_type_id),
    dest_address: form.dest_address || "",
    packaging_type: form.packaging_type || "",
    notes: form.notes || "",
    cargo_type_other: form.cargo_type === "other" ? form.cargo_type_other : "",
    receiver_national_id: form.receiver_national_id || "",
    receiver_postal_code: form.receiver_postal_code || "",
  };
}

function Section({ title, children }) {
  return (
    <section className="space-y-3">
      <h4 className="text-xs font-bold text-[#087f8c]">{title}</h4>
      {children}
    </section>
  );
}

export default function ShipmentEditForm({ form, onChange }) {
  const [cities, setCities] = useState([]);
  const [originZones, setOriginZones] = useState([]);
  const [destZones, setDestZones] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [meters, setMeters] = useState({
    length: cmToMeter(form.length_cm),
    width: cmToMeter(form.width_cm),
    height: cmToMeter(form.height_cm),
  });

  useEffect(() => {
    getCities()
      .then((rows) => setCities(mergeCityCatalog(rows)))
      .catch(() => setCities(IRAN_CITIES));
    getVehicleTypes().then(setVehicles).catch(() => setVehicles([]));
  }, []);

  const originCity = cities.find((city) => String(city.id) === String(form.origin_city_id));
  const destCity = cities.find((city) => String(city.id) === String(form.dest_city_id));
  const originIsTehran = (originCity?.name || form.origin_city_name || "").trim() === "تهران";
  const destIsTehran = destCity?.name?.trim() === "تهران";

  useEffect(() => {
    if (!form.origin_city_id || originIsTehran) {
      setOriginZones([]);
      return;
    }
    getZonesByCity(form.origin_city_id).then(setOriginZones).catch(() => setOriginZones([]));
  }, [form.origin_city_id, originIsTehran]);

  useEffect(() => {
    if (!form.dest_city_id || destIsTehran) {
      setDestZones([]);
      return;
    }
    getZonesByCity(form.dest_city_id).then(setDestZones).catch(() => setDestZones([]));
  }, [form.dest_city_id, destIsTehran]);

  const originZoneOptions = (originIsTehran ? TEHRAN_ZONES : originZones).map((zone) => ({
    value: zone.id,
    label: zone.name,
  }));
  const destZoneOptions = (destIsTehran ? TEHRAN_ZONES : destZones).map((zone) => ({
    value: zone.id,
    label: zone.name,
  }));

  const supportedVehicles = vehicles.filter((vehicle) => vehicleCategory(vehicle.title));
  const selectedVehicle = supportedVehicles.find((vehicle) => String(vehicle.id) === String(form.vehicle_type_id));
  const variants = selectedVehicle ? VEHICLE_VARIANTS[vehicleCategory(selectedVehicle.title)] || [] : [];

  const set = (key, value) => onChange({ ...form, [key]: value });

  const updateMeters = (key, stateKey, raw) => {
    const normalized = toEnglishDigits(raw).replace(/[^\d.]/g, "");
    const parts = normalized.split(".");
    const clean = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join("")}` : normalized;
    setMeters((prev) => ({ ...prev, [key]: clean }));
    set(stateKey, meterToCm(clean));
  };

  const toggleRange = (key) => {
    const nextKeys = TIME_RANGES.filter((range) =>
      range.key === key ? !form.loading_time_ranges.includes(key) : form.loading_time_ranges.includes(range.key),
    ).map((range) => range.key);
    onChange({ ...form, ...syncTimeBounds(nextKeys) });
  };

  const toggleVariant = (variant) => {
    const current = form.vehicle_variants || [];
    const next = current.includes(variant)
      ? current.filter((item) => item !== variant)
      : [...current, variant];
    set("vehicle_variants", next);
  };

  const options = useMemo(() => cityOptions(cities), [cities]);

  return (
    <div className="space-y-5">
      <Section title="مبدأ">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SearchableSelect
            label="شهر مبدأ"
            required
            value={form.origin_city_id}
            options={options}
            placeholder="جستجو یا انتخاب شهر..."
            onChange={(cityId) => {
              const city = cities.find((item) => String(item.id) === String(cityId));
              onChange({
                ...form,
                origin_city_id: cityId ? Number(cityId) : "",
                origin_city_name: city?.name?.trim() || "",
                origin_zone_id: "",
              });
            }}
          />
          <SearchableSelect
            label={originIsTehran ? "محدوده مبدأ" : "محدوده مبدأ (اختیاری)"}
            required={originIsTehran}
            disabled={!form.origin_city_id}
            value={form.origin_zone_id}
            options={originZoneOptions}
            placeholder="انتخاب محدوده"
            onChange={(zoneId) => set("origin_zone_id", zoneId ? Number(zoneId) : "")}
          />
        </div>
        <Input
          label="آدرس مبدأ"
          required
          value={form.origin_address}
          onChange={(e) => set("origin_address", e.target.value)}
        />
      </Section>

      <Section title="مقصد">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SearchableSelect
            label="شهر مقصد"
            required
            value={form.dest_city_id}
            options={options}
            placeholder="جستجو یا انتخاب شهر..."
            onChange={(cityId) => onChange({ ...form, dest_city_id: cityId ? Number(cityId) : "", dest_zone_id: "" })}
          />
          <SearchableSelect
            label="محدوده مقصد (اختیاری)"
            disabled={!form.dest_city_id}
            value={form.dest_zone_id}
            options={destZoneOptions}
            placeholder="انتخاب محدوده"
            onChange={(zoneId) => set("dest_zone_id", zoneId ? Number(zoneId) : "")}
          />
        </div>
        <Input
          label="آدرس مقصد"
          value={form.dest_address}
          onChange={(e) => set("dest_address", e.target.value)}
        />
      </Section>

      <Section title="کالا">
        <SearchableSelect
          label="نوع کالا"
          required
          value={form.cargo_type}
          options={cargoOptions}
          stickyOptionValue="other"
          placeholder="جستجو یا انتخاب نوع کالا..."
          onChange={(value) => set("cargo_type", value)}
        />
        {form.cargo_type === "other" && (
          <Input
            label="توضیح نوع کالا"
            required
            value={form.cargo_type_other}
            onChange={(e) => set("cargo_type_other", e.target.value)}
          />
        )}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="بسته‌بندی" value={form.packaging_type} onChange={(e) => set("packaging_type", e.target.value)} />
          <Input
            label="وزن (کیلوگرم)"
            required
            inputMode="decimal"
            value={form.weight_kg}
            onChange={(e) => set("weight_kg", toEnglishDigits(e.target.value).replace(/[^\d.]/g, ""))}
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Input label="طول (متر)" inputMode="decimal" value={meters.length} onChange={(e) => updateMeters("length", "length_cm", e.target.value)} />
          <Input label="عرض (متر)" inputMode="decimal" value={meters.width} onChange={(e) => updateMeters("width", "width_cm", e.target.value)} />
          <Input label="ارتفاع (متر)" inputMode="decimal" value={meters.height} onChange={(e) => updateMeters("height", "height_cm", e.target.value)} />
        </div>
        <Input
          label="ارزش کالا (ریال)"
          required
          inputMode="numeric"
          value={form.cargo_value}
          onChange={(e) => set("cargo_value", toEnglishDigits(e.target.value).replace(/[^\d]/g, ""))}
        />
        <Input as="textarea" rows={2} label="توضیحات" value={form.notes} onChange={(e) => set("notes", e.target.value)} />
      </Section>

      <Section title="زمان بارگیری">
        <JalaliDatePicker label="تاریخ بارگیری" required value={form.loading_date} onChange={(value) => set("loading_date", value)} />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {TIME_RANGES.map((range) => {
            const active = form.loading_time_ranges.includes(range.key);
            return (
              <button
                type="button"
                key={range.key}
                onClick={() => toggleRange(range.key)}
                className={`rounded-lg border px-2 py-2 text-xs font-medium ${
                  active ? "border-[#087f8c] bg-[#087f8c] text-white" : "border-[#d8e1dc] text-[#17383b]"
                }`}
              >
                {range.label}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(URGENCY_LABELS).filter(([key]) => key === "urgent" || key === "scheduled").map(([key, label]) => (
            <button
              type="button"
              key={key}
              onClick={() => set("urgency", key)}
              className={`rounded-full border px-3 py-1.5 text-xs ${
                form.urgency === key ? "border-[#087f8c] bg-[#e7f4f5] text-[#087f8c]" : "border-[#d8e1dc] text-[#526d70]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="خودرو و بارگیری">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {supportedVehicles.map((vehicle) => {
            const active = String(form.vehicle_type_id) === String(vehicle.id);
            const title = vehicleCategory(vehicle.title) === "flatbed" ? "تریلی" : vehicle.title;
            return (
              <button
                type="button"
                key={vehicle.id}
                onClick={() => onChange({ ...form, vehicle_type_id: vehicle.id, vehicle_variants: active ? form.vehicle_variants : [] })}
                className={`rounded-lg border px-3 py-2 text-right text-sm ${
                  active ? "border-[#087f8c] bg-[#e7f4f5] font-semibold text-[#17383b]" : "border-[#d8e1dc]"
                }`}
              >
                {title}
              </button>
            );
          })}
        </div>
        {variants.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {variants.map((variant) => {
              const active = form.vehicle_variants.includes(variant);
              return (
                <button
                  type="button"
                  key={variant}
                  onClick={() => toggleVariant(variant)}
                  className={`rounded-full border px-3 py-1.5 text-xs ${
                    active ? "border-[#087f8c] bg-[#087f8c] text-white" : "border-[#d8e1dc] text-[#17383b]"
                  }`}
                >
                  {variant}
                </button>
              );
            })}
          </div>
        )}
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {Object.entries(HANDLING_LABELS).map(([key, label]) => (
            <button
              type="button"
              key={key}
              onClick={() => set("loading_method", key)}
              className={`rounded-lg border px-2 py-2 text-xs ${
                form.loading_method === key ? "border-[#087f8c] bg-[#e7f4f5] text-[#087f8c]" : "border-[#d8e1dc]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="گیرنده و کرایه">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="نام گیرنده" required value={form.receiver_name} onChange={(e) => set("receiver_name", e.target.value)} />
          <Input label="موبایل گیرنده" required dir="ltr" value={form.receiver_phone} onChange={(e) => set("receiver_phone", toEnglishDigits(e.target.value).replace(/[^\d]/g, ""))} />
          <Input label="کد ملی" dir="ltr" value={form.receiver_national_id} onChange={(e) => set("receiver_national_id", toEnglishDigits(e.target.value).replace(/[^\d]/g, "").slice(0, 10))} />
          <Input label="کد پستی" dir="ltr" value={form.receiver_postal_code} onChange={(e) => set("receiver_postal_code", toEnglishDigits(e.target.value).replace(/[^\d]/g, "").slice(0, 10))} />
          <Input label="کرایه پیشنهادی (تومان)" required inputMode="numeric" value={form.proposed_price} onChange={(e) => set("proposed_price", toEnglishDigits(e.target.value).replace(/[^\d]/g, ""))} />
        </div>
      </Section>
    </div>
  );
}
