import { useEffect, useState } from 'react';
import { Truck } from 'lucide-react';
import { getVehicleTypes } from '../../api/shipment.api';
import StepHeader from './StepHeader';

const VEHICLE_VARIANTS = {
  khavar911: ['روباز', 'بغل بازشو', 'مسقف', 'مسقف اتاق بزرگ', 'کمپرسی', 'یخچال‌دار'],
  single: ['روباز', 'بغل بازشو', 'مسقف', 'کمپرسی', 'یخچال‌دار'],
  double: ['روباز', 'بغل بازشو', 'مسقف', 'کمپرسی', 'یخچال‌دار'],
  flatbed: ['کفی', 'نیم لبه', 'لبه‌دار', 'ترانزیت چادری', 'کمپرسی', 'تیغه (کانتینربر)', 'کانتینر', 'یخچال‌دار', 'کمرشکن', 'بوژی'],
};

function vehicleCategory(title = '') {
  const normalized = title.replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)));
  if (normalized.includes('خاور') || normalized.includes('911')) return 'khavar911';
  if (normalized.includes('کامیون تک')) return 'single';
  if (normalized.includes('کامیون جفت')) return 'double';
  if (normalized.includes('تریلی')) return 'flatbed';
  return null;
}

export default function Step9_Vehicle({ data, onChange }) {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getVehicleTypes()
      .then(setVehicles)
      .catch(() => setVehicles([]))
      .finally(() => setLoading(false));
  }, []);

  const supportedVehicles = vehicles.filter((vehicle) => vehicleCategory(vehicle.title));
  const selectedVehicle = supportedVehicles.find((vehicle) => vehicle.id === data.vehicle_type_id);
  const selectedCategory = selectedVehicle ? vehicleCategory(selectedVehicle.title) : null;
  const variants = selectedCategory ? VEHICLE_VARIANTS[selectedCategory] : [];
  const selectedVariants = Array.isArray(data.vehicle_variants) ? data.vehicle_variants : [];
  const displayTitle = (vehicle) => vehicleCategory(vehicle.title) === 'flatbed' ? 'تریلی' : vehicle.title;

  const suitable = (v) => {
    if (data.weight_kg && v.max_weight_kg < Number(data.weight_kg)) return false;
    if (data.length_cm && v.max_length_cm && v.max_length_cm < Number(data.length_cm)) return false;
    if (data.width_cm && v.max_width_cm && v.max_width_cm < Number(data.width_cm)) return false;
    if (data.height_cm && v.max_height_cm && v.max_height_cm < Number(data.height_cm)) return false;
    return true;
  };

  return (
    <div className="space-y-5">
      <StepHeader title="انتخاب نوع کشنده" description="بر اساس وزن و ابعاد بار وارد شده، خودروهای مناسب را پیشنهاد می‌دهیم." />

      {loading ? (
        <p className="text-sm text-ink-300">در حال دریافت فهرست خودروها...</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {supportedVehicles.map((v) => {
            const active = data.vehicle_type_id === v.id;
            const fits = suitable(v);
            return (
              <button
                type="button"
                key={v.id}
                onClick={() => {
                  if (data.vehicle_type_id !== v.id) {
                    onChange('vehicle_type_id', v.id);
                    onChange('vehicle_variants', []);
                  }
                }}
                className={`flex items-start gap-3 rounded-lg border p-3.5 text-right transition-colors ${
                  active
                    ? 'border-amber-500 bg-amber-50'
                    : 'border-ink-100 bg-white hover:border-ink-300'
                } ${!fits ? 'opacity-50' : ''}`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                    active ? 'bg-amber-500 text-ink-950' : 'bg-ink-50 text-ink-500'
                  }`}
                >
                  <Truck size={17} />
                </span>
                <span>
                  <span className="block text-sm font-medium text-ink-900">{displayTitle(v)}</span>
                  <span className="tabular mt-0.5 block text-xs text-ink-300">
                    تا {v.max_weight_kg.toLocaleString('fa-IR')} کیلوگرم
                    {!fits && ' · متناسب با بار شما نیست'}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
      {!loading && data.vehicle_type_id && !suitable(supportedVehicles.find((v) => v.id === data.vehicle_type_id) || {}) && (
        <p className="rounded-lg bg-amber-50 px-3.5 py-2.5 text-xs text-amber-700">
          خودروی انتخابی با وزن/ابعاد بار شما تناسب کامل ندارد؛ این درخواست برای بررسی دقیق‌تر نزد اپراتور علامت‌گذاری می‌شود.
        </p>
      )}
      {selectedVehicle && (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-ink-700">انتخاب نوع گاری</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {variants.map((variant) => {
              const active = selectedVariants.includes(variant);
              return (
                <button
                  type="button"
                  key={variant}
                  aria-pressed={active}
                  onClick={() => onChange('vehicle_variants', active ? selectedVariants.filter((item) => item !== variant) : [...selectedVariants, variant])}
                  className={`rounded-lg border px-3 py-2.5 text-right text-sm transition-colors ${
                    active
                      ? 'border-amber-500 bg-amber-50 text-amber-700'
                      : 'border-ink-100 bg-white text-ink-600 hover:border-ink-300'
                  }`}
                >
                  {variant}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}
    </div>
  );
}
