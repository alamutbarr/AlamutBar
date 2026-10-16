// frontend/src/driver/missionSearch/ManualSearchPanel.jsx
//
// بخش «جست‌وجوی دستی»: انتخاب مبدأ/مقصد از فهرست واقعی استان‌ها و شهرها،
// سپس نمایش بارهای منطبق با مسیر انتخابی.

import { useEffect, useState } from 'react';
import { Search, AlertTriangle, ArrowLeftRight } from 'lucide-react';
import { LocationAutocomplete } from './LocationAutocomplete';
import { fetchMissionsByRoute } from './api';
import { MissionResultCard } from './MissionResultCard';
import { ListSkeleton } from '@/driver/components/ListSkeleton';
import { EmptyState } from '@/driver/components/EmptyState';

function toSearchParams(selection) {
  if (!selection) return {};
  if (selection.type === 'city') return { cityId: selection.id, provinceId: null };
  return { cityId: null, provinceId: selection.id };
}

export function ManualSearchPanel({ onMissionClick }) {
  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const [missions, setMissions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!origin && !destination) {
      setMissions(null);
      return;
    }

    const originParams = toSearchParams(origin);
    const destParams = toSearchParams(destination);

    setLoading(true);
    setError(null);

    fetchMissionsByRoute({
      originCityId: originParams.cityId,
      originProvinceId: originParams.provinceId,
      destCityId: destParams.cityId,
      destProvinceId: destParams.provinceId,
    })
      .then((data) => setMissions(data.missions ?? []))
      .catch(() => {
        setError('خطا در جست‌وجوی بارهای منطبق با این مسیر.');
        setMissions([]);
      })
      .finally(() => setLoading(false));
  }, [origin, destination]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
        <LocationAutocomplete label="مبدأ" value={origin} onChange={setOrigin} placeholder="انتخاب مبدأ..." />
        <div className="flex items-center justify-center">
          <ArrowLeftRight className="w-4 h-4 text-slate-300" />
        </div>
        <LocationAutocomplete label="مقصد" value={destination} onChange={setDestination} placeholder="انتخاب مقصد..." />
      </div>

      {!origin && !destination ? (
        <EmptyState
          icon={<Search className="w-8 h-8" />}
          title="مبدأ یا مقصد را انتخاب کنید"
          description="برای مشاهده‌ی بارهای منطبق، حداقل یکی از فیلدهای مبدأ یا مقصد را پر کنید."
        />
      ) : loading ? (
        <ListSkeleton count={3} />
      ) : error ? (
        <EmptyState
          icon={<AlertTriangle className="w-8 h-8" />}
          title="خطا در جست‌وجو"
          description={error}
        />
      ) : missions && missions.length === 0 ? (
        <EmptyState
          icon={<Search className="w-8 h-8" />}
          title="باری با این مسیر پیدا نشد"
          description="می‌توانید مبدأ یا مقصد را تغییر دهید تا نتایج به‌روزرسانی شود."
        />
      ) : missions ? (
        <div className="space-y-3">
          {missions.map((m) => (
            <MissionResultCard key={m.id} mission={m} onClick={() => onMissionClick?.(m)} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
