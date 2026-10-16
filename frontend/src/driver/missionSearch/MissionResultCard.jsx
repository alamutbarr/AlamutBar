// frontend/src/driver/missionSearch/MissionResultCard.jsx
//
// کارت نمایش یک بار پیدا شده از جست‌وجوی مکانی (GPS یا دستی). فقط فیلدهایی
// که واقعاً روی mission مقدار دارند نمایش داده می‌شوند؛ هیچ مقدار پیش‌فرض یا
// ساختگی اینجا تولید نمی‌شود.

import { MapPin, Navigation, Truck, Package, Weight, Clock, DollarSign, Route, ChevronLeft } from 'lucide-react';
import { formatPrice, formatWeight, vehicleTypeLabels } from '@/driver/driverFormat';

export function MissionResultCard({ mission, onClick }) {
  const originLabel = [mission.originCity, mission.originArea].filter(Boolean).join(' — ');
  const destLabel = [mission.destCity, mission.destArea].filter(Boolean).join(' — ');

  return (
    <button
      onClick={onClick}
      className="glass-card w-full text-right rounded-2xl p-4 active:scale-[0.99]"
    >
      <div className="space-y-2 mb-3">
        {originLabel && (
          <div className="flex items-center gap-1.5 text-sm text-slate-600 min-w-0">
            <MapPin className="w-4 h-4 text-blue-500 shrink-0" />
            <span className="truncate font-medium">{originLabel}</span>
          </div>
        )}
        {destLabel && (
          <div className="flex items-center gap-1.5 text-sm text-slate-600 min-w-0">
            <Navigation className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="truncate font-medium">{destLabel}</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500 mb-3">
        {mission.vehicleTypeRequired && (
          <span className="flex items-center gap-1">
            <Truck className="w-3.5 h-3.5" />
            {vehicleTypeLabels[mission.vehicleTypeRequired] || mission.vehicleTypeRequired}
          </span>
        )}
        {mission.cargo?.type && (
          <span className="flex items-center gap-1">
            <Package className="w-3.5 h-3.5" />
            {mission.cargo.type}
          </span>
        )}
        {mission.cargo?.weightTons != null && (
          <span className="flex items-center gap-1">
            <Weight className="w-3.5 h-3.5" />
            {formatWeight(mission.cargo.weightTons)}
          </span>
        )}
        {mission.timeWindow?.pickupFrom && (
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {mission.timeWindow.pickupFrom}
          </span>
        )}
        {mission.distanceKm != null && (
          <span className="flex items-center gap-1 text-blue-600 font-medium">
            <Route className="w-3.5 h-3.5" />
            {new Intl.NumberFormat('fa-IR').format(mission.distanceKm)} کیلومتر تا شما
          </span>
        )}
      </div>

      <div className="flex items-center justify-between">
        {mission.price != null && (
          <span className="flex items-center gap-1 text-sm font-bold text-slate-800">
            <DollarSign className="w-3.5 h-3.5 text-slate-400" />
            {formatPrice(mission.price)}
          </span>
        )}
        <ChevronLeft className="w-5 h-5 text-slate-400 mr-auto" />
      </div>
    </button>
  );
}
