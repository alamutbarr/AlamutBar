import { useEffect, useState, useMemo } from "react";
import { MapPin } from "lucide-react";
import Input from "../common/Input";
import LocationPicker from "../common/LocationPicker";
import SearchableSelect from "../common/SearchableSelect";
import StepHeader from "./StepHeader";
import { getCities, getZonesByCity } from "../../api/location.api";
import { cityOptionKey, mergeCityCatalog } from "../../data/mergeCities";
import { IRAN_CITIES } from "../../data/iranCities";
import { nearestCity, pinWithinCity } from "../../utils/cityBounds";

const TEHRAN_ZONES = [
  { id: 1, name: "مرکز، شمال و بافت متراکم" },
  { id: 2, name: "غرب و شمال غرب" },
  { id: 3, name: "غرب مرکزی و جنوب غرب صنعتی" },
  { id: 4, name: "شرق و شمال شرق" },
  { id: 5, name: "جنوب و جنوب شرق" },
];

export default function Step1_Origin({ data, onChange }) {
  const [cities, setCities] = useState([]);
  const [zones, setZones] = useState([]);
  const [pinError, setPinError] = useState("");

  // بارگذاری شهرها: اولویت با دیتابیس است؛ در صورت خالی بودن یا آفلاین بودن، از دیتای کامل استفاده می‌شود
  useEffect(() => {
    getCities()
      .then((apiCities) => setCities(mergeCityCatalog(apiCities)))
      .catch(() => setCities(IRAN_CITIES));
  }, []);
  const selectedCity = useMemo(() => {
    return cities.find((c) => String(c.id) === String(data.origin_city_id));
  }, [cities, data.origin_city_id]);

  const isTehran = selectedCity?.name?.trim() === "تهران";

  // دریافت محدوده‌ها برای شهرهای غیر از تهران
  useEffect(() => {
    if (!data.origin_city_id || isTehran) {
      setZones([]);
      return;
    }
    getZonesByCity(data.origin_city_id)
      .then(setZones)
      .catch(() => setZones([]));
  }, [data.origin_city_id, isTehran]);

  // لیست نهایی محدوده‌ها بر اساس منطق تهران
  const availableZones = useMemo(() => {
    if (!data.origin_city_id) return [];
    if (isTehran) return TEHRAN_ZONES;
    return zones;
  }, [data.origin_city_id, isTehran, zones]);

  // پاک کردن محدوده نامعتبر پس از تغییر شهر
  useEffect(() => {
    if (data.origin_zone_id && data.origin_city_id) {
      const isValid = availableZones.some(
        (z) => Number(z.id) === Number(data.origin_zone_id),
      );
      if (!isValid) {
        onChange("origin_zone_id", "");
      }
    }
  }, [data.origin_city_id, availableZones]);

  useEffect(() => {
    if (!selectedCity || selectedCity.lat == null) return;
    if (data.origin_lat === "" || data.origin_lat == null) return;
    if (pinWithinCity({ lat: data.origin_lat, lng: data.origin_lng }, selectedCity)) return;
    onChange("origin_lat", "");
    onChange("origin_lng", "");
    setPinError("نقطهٔ قبلی خارج از شهر انتخاب‌شده بود و پاک شد.");
  }, [selectedCity?.id, selectedCity?.lat, selectedCity?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePick = (lat, lng, address) => {
    let city = selectedCity;
    if (!city) {
      city = nearestCity({ lat, lng }, cities);
      if (!city) {
        setPinError("شهری در محدودهٔ این نقطه پیدا نشد. شهر را از فهرست انتخاب کنید.");
        return;
      }
      onChange("origin_city_id", Number(city.id));
      onChange("origin_city_name", city.name?.trim() || "");
      onChange("origin_zone_id", "");
    } else if (!pinWithinCity({ lat, lng }, city)) {
      setPinError(`این نقطه داخل «${city.name}» نیست.`);
      return;
    }
    setPinError("");
    onChange("origin_lat", lat);
    onChange("origin_lng", lng);
    if (address) onChange("origin_address", address);
  };

  return (
    <div className="space-y-5">
      <StepHeader
        title="مبدأ بارگیری"
        description="روی نقشه محل دقیق رو مشخص کن؛ آدرس دقیق فقط برای راننده‌ی تأییدشده نمایش داده می‌شود."
      />

      <div className="relative z-20 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SearchableSelect
          label="شهر مبدأ"
          required
          value={data.origin_city_id || ""}
          placeholder="جستجوی نام شهر مبدأ..."
          options={cities.map((c) => ({
            value: c.id,
            key: cityOptionKey(c),
            label: c.name,
            subLabel: c.province ? `استان ${c.province}` : undefined,
            searchKey: `${c.name || ""} ${c.province || ""}`,
          }))}
          onChange={(cityId) => {
            const city = cities.find((c) => String(c.id) === String(cityId));
            onChange("origin_city_id", cityId ? Number(cityId) : "");
            onChange("origin_city_name", city?.name?.trim() || "");
            onChange("origin_zone_id", "");
          }}
          noResultsText="شهری با این مشخصات یافت نشد"
        />

        <SearchableSelect
          label={isTehran ? "محدوده مبدأ" : "محدوده مبدأ (اختیاری)"}
          required={isTehran}
          disabled={!data.origin_city_id}
          value={data.origin_zone_id || ""}
          placeholder={
            data.origin_city_id
              ? "جستجو یا انتخاب محدوده..."
              : "ابتدا شهر را انتخاب کنید"
          }
          options={availableZones.map((z) => ({
            value: z.id,
            label: z.name,
          }))}
          onChange={(zoneId) =>
            onChange("origin_zone_id", zoneId ? Number(zoneId) : "")
          }
          noResultsText="محدوده‌ای برای این شهر یافت نشد"
        />
      </div>
      {isTehran && !data.origin_zone_id && (
        <p className="-mt-2 text-xs text-[#087f8c]">
          برای تهران، انتخاب محدوده مبدأ الزامی است.
        </p>
      )}

      <LocationPicker
        lat={data.origin_lat}
        lng={data.origin_lng}
        focus={selectedCity?.lat != null ? { lat: Number(selectedCity.lat), lng: Number(selectedCity.lng) } : null}
        onPick={handlePick}
        placeholder="جست‌وجوی آدرس مبدأ..."
      />
      {pinError && <p className="text-sm text-red-600">{pinError}</p>}
      {data.origin_lat !== "" && data.origin_lat != null && (
        <p className="text-xs text-[#526d70]" data-pin="origin">
          موقعیت ثبت‌شده داخل {selectedCity?.name || "شهر انتخاب‌شده"}:{" "}
          <bdi dir="ltr">{Number(data.origin_lat).toFixed(4)}, {Number(data.origin_lng).toFixed(4)}</bdi>
        </p>
      )}

      <Input
        as="textarea"
        rows={2}
        label="آدرس دقیق مبدأ"
        icon={MapPin}
        value={data.origin_address || ""}
        onChange={(e) => onChange("origin_address", e.target.value)}
        placeholder="پلاک، واحد و جزئیاتی که نقشه نشون نمی‌ده رو اینجا کامل کن"
        hint="با انتخاب روی نقشه خودکار پر می‌شود؛ در صورت نیاز ویرایشش کن."
        required
      />
    </div>
  );
}
