// frontend/src/driver/missionSearch/NearbyMissionsPanel.jsx
//
// بخش «بارهای اطراف من»: دریافت GPS واقعی راننده -> تعیین استان -> نمایش
// پلکانی بارها از نزدیک‌ترین (۵۰ کیلومتر) به دورترین تا پوشش کل استان
// (۵۰ -> ۱۰۰ -> ۲۰۰ -> ...) با فیلتر اختیاری استان مقصد.

import { useEffect, useState, useCallback } from 'react';
import { MapPin, Navigation, Loader2, AlertTriangle, RotateCcw, X, ChevronDown } from 'lucide-react';
import { useGeolocation } from './useGeolocation';
import { reverseGeocodeApi, fetchNearbyMissions } from './api';
import { LocationAutocomplete } from './LocationAutocomplete';
import { MissionResultCard } from './MissionResultCard';
import { ListSkeleton } from '@/components/ListSkeleton';
import { EmptyState } from '@/components/EmptyState';

const GPS_ERROR_MESSAGES = {
  unsupported: 'مرورگر شما از موقعیت مکانی پشتیبانی نمی‌کند.',
  denied: 'اجازه دسترسی به موقعیت مکانی داده نشد. برای مشاهده‌ی بارهای اطراف، دسترسی را از تنظیمات مرورگر فعال کنید.',
  unavailable: 'موقعیت مکانی در حال حاضر در دسترس نیست.',
  timeout: 'زمان دریافت موقعیت مکانی به پایان رسید.',
  unknown: 'خطایی در دریافت موقعیت مکانی رخ داد.',
};

export function NearbyMissionsPanel({ onMissionClick, onSwitchToManual }) {
  const { status: gpsStatus, coords, errorCode, requestLocation } = useGeolocation();

  const [provinceState, setProvinceState] = useState({ status: 'idle', data: null, error: null });
  const [destProvince, setDestProvince] = useState(null); // { type: 'province', id, name }
  const [missions, setMissions] = useState(null);
  const [missionsLoading, setMissionsLoading] = useState(false);
  const [missionsError, setMissionsError] = useState(null);
  const [bands, setBands] = useState([]); // باندهای شعاعی دارای بار (صعودی)
  const [revealedBands, setRevealedBands] = useState(1); // تعداد باندهای نمایش‌داده‌شده

  // به محض دریافت موفق مختصات GPS، استان را از بک‌اند تعیین می‌کنیم
  useEffect(() => {
    if (gpsStatus !== 'success' || !coords) return;
    let cancelled = false;
    setProvinceState({ status: 'loading', data: null, error: null });

    reverseGeocodeApi(coords.lat, coords.lng)
      .then((data) => {
        if (!cancelled) setProvinceState({ status: 'success', data, error: null });
      })
      .catch(() => {
        if (!cancelled) {
          setProvinceState({
            status: 'error',
            data: null,
            error: 'تعیین استان از روی موقعیت مکانی ممکن نشد. لطفاً دوباره تلاش کنید.',
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [gpsStatus, coords]);

  const loadMissions = useCallback(() => {
    if (!coords) return;
    setMissionsLoading(true);
    setMissionsError(null);
    fetchNearbyMissions({
      lat: coords.lat,
      lng: coords.lng,
      destProvince: destProvince?.name,
    })
      .then((data) => {
        setMissions(data.missions ?? []);
        setBands(data.bands ?? []);
        setRevealedBands(1);
      })
      .catch(() => {
        setMissionsError('خطا در دریافت بارهای اطراف شما. لطفاً دوباره تلاش کنید.');
        setMissions([]);
      })
      .finally(() => setMissionsLoading(false));
  }, [coords, destProvince]);

  // به محض آماده شدن مختصات، بارها را جست‌وجو کن؛ با تغییر مقصد هم به‌روزرسانی کن
  useEffect(() => {
    if (gpsStatus === 'success' && coords) {
      loadMissions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gpsStatus, coords, destProvince]);

  // نمایش پلکانی: ابتدا نزدیک‌ترین باند (۵۰ کیلومتر)، سپس با هر بار کلیک روی
  // دکمه‌ی «نمایش بارهای دورتر» باند بعدی افزوده می‌شود تا کل استان پوشش داده شود.
  const visibleBandKm = bands.length ? bands[revealedBands - 1] : null;
  const visibleMissions = !missions
    ? null
    : visibleBandKm == null
      ? missions
      : missions.filter((m) => (m.bandKm ?? Number.MAX_SAFE_INTEGER) <= visibleBandKm);
  const canExpand = bands.length > 0 && revealedBands < bands.length;
  const nextBandKm = canExpand ? bands[revealedBands] : null;
  const allRevealed = bands.length > 0 && revealedBands >= bands.length;

  // --- حالت اولیه: هنوز GPS درخواست نشده ---
  if (gpsStatus === 'idle') {
    return (
      <div className="glass-card anim-text rounded-2xl p-6 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-500">
          <MapPin className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-slate-800 mb-1.5">نیاز به دسترسی موقعیت مکانی</h3>
        <p className="text-sm text-slate-500 mb-4 leading-6">
          برای نمایش بارهای نزدیک شما، اجازه دسترسی به موقعیت مکانی خود را فعال کنید.
        </p>
        <button
          type="button"
          onClick={requestLocation}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700 transition active:scale-[0.98]"
        >
          <Navigation className="w-4 h-4" />
          فعال‌سازی موقعیت مکانی
        </button>
      </div>
    );
  }

  // --- در حال دریافت موقعیت مکانی ---
  if (gpsStatus === 'locating') {
    return (
      <div className="glass-card anim-text rounded-2xl p-6 text-center">
        <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-blue-500" />
        <p className="text-sm font-medium text-slate-600">در حال دریافت موقعیت مکانی...</p>
      </div>
    );
  }

  // --- خطای GPS ---
  if (gpsStatus === 'error') {
    return (
      <div className="anim-text rounded-2xl border border-rose-200/70 bg-rose-50/60 p-6 text-center backdrop-blur-md">
        <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-rose-500" />
        <p className="text-sm font-medium text-rose-700 mb-4">
          {GPS_ERROR_MESSAGES[errorCode] || GPS_ERROR_MESSAGES.unknown}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={requestLocation}
            className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-700 transition"
          >
            <RotateCcw className="w-4 h-4" />
            تلاش مجدد
          </button>
          {onSwitchToManual && (
            <button
              type="button"
              onClick={onSwitchToManual}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
            >
              رفتن به جست‌وجوی دستی
            </button>
          )}
        </div>
      </div>
    );
  }

  // --- gpsStatus === 'success': نمایش مبدأ فعلی + فیلتر مقصد + نتایج ---
  return (
    <div className="space-y-4">
      {/* مبدأ فعلی (غیرقابل تغییر) */}
      <div className="glass-card anim-text d-1 rounded-2xl p-4">
        <p className="mb-1.5 text-xs font-medium text-slate-500">مبدأ فعلی شما</p>
        {provinceState.status === 'loading' && (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            در حال تعیین استان از روی موقعیت مکانی...
          </div>
        )}
        {provinceState.status === 'error' && (
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-sm text-rose-600">
              <AlertTriangle className="w-4 h-4" />
              {provinceState.error}
            </span>
            <button
              type="button"
              onClick={requestLocation}
              className="shrink-0 rounded-lg border border-rose-300 px-2.5 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50"
            >
              تلاش مجدد
            </button>
          </div>
        )}
        {provinceState.status === 'success' && (
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-500 shrink-0" />
            <span className="text-sm font-bold text-slate-800">استان {provinceState.data.province}</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
              از موقعیت مکانی فعلی
            </span>
            {provinceState.data.accuracy === 'approximate' && (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-600">
                تخمینی
              </span>
            )}
          </div>
        )}
      </div>

      {/* استان مقصد (اختیاری) */}
      <div className="glass-card anim-text d-2 relative z-10 rounded-2xl p-4">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <LocationAutocomplete
              label="استان مقصد (اختیاری)"
              value={destProvince}
              onChange={(val) => {
                // در این بخش فقط انتخاب استان معنا دارد؛ اگر کاربر شهری را
                // انتخاب کند، استان همان شهر به‌عنوان فیلتر مقصد در نظر گرفته می‌شود.
                if (!val) {
                  setDestProvince(null);
                } else if (val.type === 'province') {
                  setDestProvince(val);
                } else {
                  setDestProvince({ type: 'province', id: val.provinceId, name: val.province });
                }
              }}
              placeholder="انتخاب استان مقصد..."
            />
          </div>
          {destProvince && (
            <button
              type="button"
              onClick={() => setDestProvince(null)}
              className="mb-0.5 flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-500 hover:bg-slate-50"
            >
              <X className="w-3.5 h-3.5" />
              پاک کردن
            </button>
          )}
        </div>
      </div>

      {/* نتایج */}
      <div>
        {missionsLoading ? (
          <ListSkeleton count={3} />
        ) : missionsError ? (
          <EmptyState
            icon={<AlertTriangle className="w-8 h-8" />}
            title="خطا در دریافت بارها"
            description={missionsError}
            action={
              <button
                type="button"
                onClick={loadMissions}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
              >
                تلاش مجدد
              </button>
            }
          />
        ) : missions && missions.length === 0 ? (
          <EmptyState
            icon={<MapPin className="w-8 h-8" />}
            title="باری در اطراف شما پیدا نشد"
            description={`در استان ${provinceState.data?.province || ''} باری پیشنهادی با شرایط انتخاب‌شده وجود ندارد.`}
            action={
              <div className="flex flex-wrap items-center justify-center gap-2">
                {destProvince && (
                  <button
                    type="button"
                    onClick={() => setDestProvince(null)}
                    className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                  >
                    حذف فیلتر مقصد
                  </button>
                )}
                {onSwitchToManual && (
                  <button
                    type="button"
                    onClick={onSwitchToManual}
                    className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
                  >
                    جست‌وجوی دستی
                  </button>
                )}
              </div>
            }
          />
        ) : missions ? (
          <>
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-medium text-slate-500">
                {new Intl.NumberFormat('fa-IR').format(visibleMissions.length)} بار در محدوده{' '}
                {new Intl.NumberFormat('fa-IR').format(visibleBandKm ?? 0)} کیلومتری
              </span>
              {allRevealed && (
                <span className="shrink-0 font-medium text-emerald-600">
                  کل استان {provinceState.data?.province || ''} پوشش داده شد
                </span>
              )}
            </div>

            <div className="space-y-3">
              {visibleMissions.map((m, index) => (
                <div key={m.id} className="anim-text" style={{ animationDelay: `${Math.min(index, 6) * 55}ms` }}>
                  <MissionResultCard mission={m} onClick={() => onMissionClick?.(m)} />
                </div>
              ))}
            </div>

            {canExpand && (
              <button
                type="button"
                onClick={() => setRevealedBands((n) => n + 1)}
                className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-blue-200/80 bg-blue-50/70 px-4 py-2.5 text-sm font-bold text-blue-600 backdrop-blur transition hover:bg-blue-100/80 active:scale-[0.99]"
              >
                <ChevronDown className="w-4 h-4" />
                نمایش بارهای دورتر (تا {new Intl.NumberFormat('fa-IR').format(nextBandKm)} کیلومتر)
              </button>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
