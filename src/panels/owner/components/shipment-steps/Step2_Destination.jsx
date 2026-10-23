import { useEffect, useState, useMemo } from "react";
import { Flag } from "lucide-react";
import Input from "../common/Input";
import LocationPicker from "../common/LocationPicker";
import SearchableSelect from "../common/SearchableSelect";
import StepHeader from "./StepHeader";
import { getCities, getZonesByCity } from "../../api/location.api";
import { cityOptionKey, mergeCityCatalog } from "../../data/mergeCities";
import { IRAN_CITIES } from "../../data/iranCities";

const TEHRAN_ZONES = [
  { id: 1, name: "مرکز، شمال و بافت متراکم" },
  { id: 2, name: "غرب و شمال غرب" },
  { id: 3, name: "غرب مرکزی و جنوب غرب صنعتی" },
  { id: 4, name: "شرق و شمال شرق" },
  { id: 5, name: "جنوب و جنوب شرق" },
];

export default function Step2_Destination({ data, onChange }) {
  const [cities, setCities] = useState([]);
  const [zones, setZones] = useState([]);
  useEffect(() => {
    getCities()
      .then((apiCities) => setCities(mergeCityCatalog(apiCities)))
      .catch(() => setCities(IRAN_CITIES));
  }, []);
  const selectedCity = useMemo(() => {
    return cities.find((c) => String(c.id) === String(data.dest_city_id));
  }, [cities, data.dest_city_id]);

  const isTehran = selectedCity?.name?.trim() === "تهران";

  useEffect(() => {
    if (!data.dest_city_id || isTehran) {
      setZones([]);
      return;
    }
    getZonesByCity(data.dest_city_id)
      .then(setZones)
      .catch(() => setZones([]));
  }, [data.dest_city_id, isTehran]);

  const availableZones = useMemo(() => {
    if (!data.dest_city_id) return [];
    if (isTehran) return TEHRAN_ZONES;
    return zones;
  }, [data.dest_city_id, isTehran, zones]);

  useEffect(() => {
    if (data.dest_zone_id && data.dest_city_id) {
      const isValid = availableZones.some(
        (z) => Number(z.id) === Number(data.dest_zone_id),
      );
      if (!isValid) {
        onChange("dest_zone_id", "");
      }
    }
  }, [data.dest_city_id, availableZones]);

  const handlePick = (lat, lng, address) => {
    onChange("dest_lat", lat);
    onChange("dest_lng", lng);
    if (address) onChange("dest_address", address);
  };

  return (
    <div className="space-y-5">
      <StepHeader
        title="مقصد تخلیه"
        description="روی نقشه محل دقیق رو مشخص کن؛ آدرس دقیق مقصد فقط بعد از صدور بارنامه به راننده نشان داده می‌شود."
      />

      <div className="relative z-20 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SearchableSelect
          label="شهر مقصد"
          required
          value={data.dest_city_id || ""}
          placeholder="جستجوی نام شهر مقصد..."
          options={cities.map((c) => ({
            value: c.id,
            key: cityOptionKey(c),
            label: c.name,
            subLabel: c.province ? `استان ${c.province}` : undefined,
            searchKey: `${c.name || ""} ${c.province || ""}`,
          }))}
          onChange={(cityId) => {
            onChange("dest_city_id", cityId ? Number(cityId) : "");
            onChange("dest_zone_id", "");
          }}
          noResultsText="شهری با این مشخصات یافت نشد"
        />

        <SearchableSelect
          label="محدوده مقصد (اختیاری)"
          disabled={!data.dest_city_id}
          value={data.dest_zone_id || ""}
          placeholder={
            data.dest_city_id
              ? "جستجو یا انتخاب محدوده..."
              : "ابتدا شهر را انتخاب کنید"
          }
          options={availableZones.map((z) => ({
            value: z.id,
            label: z.name,
          }))}
          onChange={(zoneId) =>
            onChange("dest_zone_id", zoneId ? Number(zoneId) : "")
          }
          noResultsText="محدوده‌ای برای این شهر یافت نشد"
        />
      </div>

      <LocationPicker
        lat={data.dest_lat}
        lng={data.dest_lng}
        onPick={handlePick}
        placeholder="جست‌وجوی آدرس مقصد..."
      />

      <Input
        as="textarea"
        rows={2}
        label="آدرس دقیق مقصد"
        icon={Flag}
        value={data.dest_address || ""}
        onChange={(e) => onChange("dest_address", e.target.value)}
        placeholder="پلاک، واحد و جزئیاتی که نقشه نشون نمی‌ده رو اینجا کامل کن"
        hint="با انتخاب روی نقشه خودکار پر می‌شود؛ در صورت نیاز ویرایشش کن."
      />
    </div>
  );
}
