import { DriverStatusBadge } from './DriverStatusBadge';
import { FlagBadges } from './FlagBadges';
import { OfferTimer } from './OfferTimer';
import { MapPin, Navigation, Truck, Package, Weight, Clock, ChevronLeft, } from 'lucide-react';
import { formatPrice, formatWeight, formatDay, formatTimeWindow, vehicleTypeLabels, } from '@/driverFormat';
export function MissionCard({ mission, onClick, }) {
    const destLabel = mission.visibleDestinationExact
        ? mission.destExact.address
        : `${mission.destCity} — ${mission.destArea}`;
    return (<button onClick={onClick} className="glass-card w-full text-right rounded-2xl p-4 active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-blue-500/40">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-bold text-white tracking-wide">
            {mission.code}
          </span>
          <DriverStatusBadge status={mission.status} size="sm"/>
        </div>
        {mission.offerExpiresAt && mission.status === 'Offered' && (<OfferTimer expiresAt={mission.offerExpiresAt}/>)}
      </div>

      <div className="space-y-2 mb-3">
        <div className="flex items-center gap-2 text-sm">
          <div className="flex items-center gap-1.5 text-slate-600 min-w-0">
            <MapPin className="w-4 h-4 text-blue-500 shrink-0"/>
            <span className="truncate font-medium">{mission.originCity}</span>
            <span className="text-slate-400 text-xs">{mission.originArea}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <div className="flex items-center gap-1.5 text-slate-600 min-w-0">
            <Navigation className="w-4 h-4 text-emerald-500 shrink-0"/>
            <span className="truncate font-medium">{mission.destCity}</span>
            <span className="text-slate-400 text-xs">{mission.destArea}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500 mb-3">
        <span className="flex items-center gap-1">
          <Truck className="w-3.5 h-3.5"/>
          {mission.vehicleLabel || vehicleTypeLabels[mission.vehicleTypeRequired] || '—'}
        </span>
        <span className="flex items-center gap-1">
          <Package className="w-3.5 h-3.5"/>
          {mission.cargo.type}
        </span>
        <span className="flex items-center gap-1">
          <Weight className="w-3.5 h-3.5"/>
          {formatWeight(mission.cargo.weightTons)}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5"/>
          {[formatDay(mission.loadingDate), formatTimeWindow(mission.timeWindow)].filter(Boolean).join(' · ') || '—'}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FlagBadges flag={mission.flag}/>
          {mission.price != null && (<span className="text-sm font-bold text-slate-800">
              {formatPrice(mission.price)}
            </span>)}
        </div>
        <ChevronLeft className="w-5 h-5 text-slate-400"/>
      </div>
    </button>);
}
