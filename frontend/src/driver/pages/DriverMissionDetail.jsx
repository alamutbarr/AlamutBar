import { useState } from 'react';
import { DriverStatusBadge } from '@/driver/components/DriverStatusBadge';
import { FlagBadges } from '@/driver/components/FlagBadges';
import { StatusTimeline } from '@/driver/components/StatusTimeline';
import { GpsPanel } from '@/driver/components/GpsPanel';
import { PodFlow } from '@/driver/components/PodFlow';
import { SosButton } from '@/driver/components/SosButton';
import { useDriverGps } from '@/driver/hooks/useDriverGps';
import { formatPrice, formatWeight, formatDate, vehicleTypeLabels, } from '@/driver/driverFormat';
import { ArrowRight, MapPin, Navigation, Truck, Package, Weight, Ruler, Clock, DollarSign, Lock, CheckCircle2, XCircle, Loader2, Route, Calendar, } from 'lucide-react';
export function DriverMissionDetail({ mission, onBack, onAccept, onDecline, onAction, onPodComplete, }) {
    const [actionLoading, setActionLoading] = useState(null);
    const gpsEnabled = ['InTransit', 'NearDestination', 'WaybillIssued'].includes(mission.status);
    const { status: gpsStatus, queueSize, onToggle, onSync, currentPoint } = useDriverGps(gpsEnabled, mission.id);
    const destLabel = mission.visibleDestinationExact
        ? mission.destExact.address
        : `${mission.destCity} — ${mission.destArea} (محدود)`;
    const handleAction = (action) => {
        setActionLoading(action);
        setTimeout(() => {
            setActionLoading(null);
            onAction?.(mission, action);
        }, 600);
    };
    const handleAccept = () => {
        setActionLoading('accept');
        setTimeout(() => {
            setActionLoading(null);
            onAccept?.(mission);
        }, 600);
    };
    const handleDecline = () => {
        setActionLoading('decline');
        setTimeout(() => {
            setActionLoading(null);
            onDecline?.(mission);
        }, 600);
    };
    return (<div className="max-w-2xl mx-auto pb-6">
      {/* Header */}
      <div className="glass-strong sticky top-0 lg:top-0 z-20 border-b border-white/60 px-4 lg:px-6 py-3 flex items-center gap-3">
        <button onClick={onBack} className="flex items-center justify-center rounded-lg p-2 text-slate-600 hover:bg-slate-100 transition">
          <ArrowRight className="w-5 h-5"/>
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-slate-900 px-2 py-0.5 text-xs font-bold text-white">{mission.code}</span>
            <DriverStatusBadge status={mission.status} size="sm"/>
          </div>
        </div>
        <FlagBadges flag={mission.flag}/>
      </div>

      <div className="p-4 lg:p-6 space-y-4">
        {/* Origin / Destination */}
        <div className="glass-card anim-text rounded-2xl p-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center pt-1">
                <div className="w-3 h-3 rounded-full bg-blue-500 ring-4 ring-blue-100"/>
                <div className="w-0.5 h-8 bg-slate-200"/>
                <div className="w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-emerald-100"/>
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">مبدأ</p>
                  <p className="text-sm font-semibold text-slate-800">{mission.originCity} — {mission.originArea}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">مقصد</p>
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold text-slate-800">{destLabel}</p>
                    {!mission.visibleDestinationExact && (<Lock className="w-3.5 h-3.5 text-slate-400"/>)}
                  </div>
                  {!mission.visibleDestinationExact && (<p className="text-xs text-amber-600 mt-0.5">آدرس دقیق پس از صدور بارنامه نمایش داده می‌شود</p>)}
                </div>
              </div>
            </div>
          </div>
          {mission.routePlanned && (<div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Route className="w-3.5 h-3.5"/>
                {new Intl.NumberFormat('fa-IR').format(mission.routePlanned.distanceKm)} کیلومتر
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5"/>
                حدود {new Intl.NumberFormat('fa-IR').format(mission.routePlanned.estimatedHours)} ساعت
              </span>
            </div>)}
        </div>

        {/* Cargo info */}
        <div className="glass-card anim-text rounded-2xl p-4">
          <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
            <Package className="w-4 h-4 text-blue-500"/>
            اطلاعات بار
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <InfoItem icon={<Package className="w-3.5 h-3.5"/>} label="نوع کالا" value={mission.cargo.type}/>
            <InfoItem icon={<Weight className="w-3.5 h-3.5"/>} label="وزن" value={formatWeight(mission.cargo.weightTons)}/>
            <InfoItem icon={<Ruler className="w-3.5 h-3.5"/>} label="ابعاد" value={mission.cargo.dimensions}/>
            <InfoItem icon={<Truck className="w-3.5 h-3.5"/>} label="خودرو مورد نیاز" value={vehicleTypeLabels[mission.vehicleTypeRequired]}/>
            <InfoItem icon={<Calendar className="w-3.5 h-3.5"/>} label="بازه بارگیری" value={mission.timeWindow.pickupFrom}/>
            <InfoItem icon={<DollarSign className="w-3.5 h-3.5"/>} label="کرایه" value={formatPrice(mission.price)}/>
          </div>
          {mission.cargo.sensitive && (<div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
              این بار حساس است — اولویت بالاتر و متصدی اجباری
            </div>)}
        </div>

        {/* Offer actions */}
        {mission.status === 'Offered' && (<div className="flex gap-3">
            <button onClick={handleDecline} disabled={actionLoading !== null} className="flex-1 flex items-center justify-center gap-2 rounded-xl border-2 border-white/70 bg-white/60 px-4 py-3.5 text-base font-bold text-slate-600 backdrop-blur transition hover:bg-white/85 disabled:opacity-50 active:scale-[0.98]">
              {actionLoading === 'decline' ? <Loader2 className="w-5 h-5 animate-spin"/> : <XCircle className="w-5 h-5"/>}
              رد کردن
            </button>
            <button onClick={handleAccept} disabled={actionLoading !== null} className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3.5 text-base font-bold text-white transition hover:bg-green-700 disabled:opacity-50 active:scale-[0.98]">
              {actionLoading === 'accept' ? <Loader2 className="w-5 h-5 animate-spin"/> : <CheckCircle2 className="w-5 h-5"/>}
              قبول مأموریت
            </button>
          </div>)}

        {/* Active mission: timeline */}
        {mission.status !== 'Offered' && mission.status !== 'Completed' && mission.status !== 'Cancelled' && mission.status !== 'Declined' && (<>
            <div className="glass-card anim-text rounded-2xl p-4">
              <h3 className="text-sm font-bold text-slate-700 mb-3">مراحل مأموریت</h3>
              <StatusTimeline currentStatus={mission.status}/>
            </div>

            {/* State-based action buttons */}
            <div className="space-y-2">
              {mission.status === 'Accepted' && (<ActionButton onClick={() => handleAction('en_route')} loading={actionLoading === 'en_route'} icon={<Navigation className="w-5 h-5"/>} label="شروع حرکت به بارگیری" color="blue"/>)}
              {mission.status === 'EnRouteToPickup' && (<ActionButton onClick={() => handleAction('arrived_pickup')} loading={actionLoading === 'arrived_pickup'} icon={<MapPin className="w-5 h-5"/>} label="رسیدم به محل بارگیری" color="blue"/>)}
              {mission.status === 'ArrivedPickup' && (<div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-center text-sm text-slate-500">
                  در انتظار کنترل/صدور بارنامه توسط اپراتور...
                </div>)}
              {mission.status === 'WaybillIssued' && (<ActionButton onClick={() => handleAction('start_move')} loading={actionLoading === 'start_move'} icon={<Navigation className="w-5 h-5"/>} label="شروع حرکت" color="green"/>)}
              {mission.status === 'InTransit' && (<div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-center text-sm text-emerald-700 font-medium">
                  در حال حمل — GPS فعال است
                </div>)}
              {mission.status === 'NearDestination' && (<div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-center text-sm text-amber-700 font-medium">
                  به مقصد رسیدید — تحویل بار را آغاز کنید
                </div>)}
            </div>

            {/* GPS Panel */}
            {(gpsEnabled || mission.status === 'InTransit' || mission.status === 'NearDestination') && (<GpsPanel status={gpsStatus} queueSize={queueSize} onToggle={onToggle} onSync={onSync} currentPoint={currentPoint}/>)}

            {/* POD Flow */}
            {(mission.status === 'NearDestination' || mission.status === 'POD') && (<PodFlow mission={mission} onComplete={(result) => onPodComplete?.(mission, result)}/>)}

            {/* SOS */}
            <div className="flex justify-center pt-2">
              <SosButton />
            </div>
          </>)}

        {/* Completed/Cancelled info */}
        {(mission.status === 'Completed' || mission.status === 'Cancelled' || mission.status === 'Declined') && (<div className={`rounded-2xl border p-4 ${mission.status === 'Completed'
                ? 'border-green-200 bg-green-50'
                : 'border-rose-200 bg-rose-50'}`}>
            <div className="flex items-center gap-2 mb-2">
              {mission.status === 'Completed' ? (<CheckCircle2 className="w-5 h-5 text-green-600"/>) : (<XCircle className="w-5 h-5 text-rose-600"/>)}
              <h3 className={`text-sm font-bold ${mission.status === 'Completed' ? 'text-green-700' : 'text-rose-700'}`}>
                {mission.status === 'Completed' ? 'مأموریت تکمیل شد' : 'مأموریت لغو شد'}
              </h3>
            </div>
            {mission.completedAt && (<p className="text-xs text-slate-500">تاریخ تکمیل: {formatDate(mission.completedAt)}</p>)}
            {mission.cancelledAt && (<p className="text-xs text-slate-500">تاریخ لغو: {formatDate(mission.cancelledAt)}</p>)}
            {mission.cancelReason && (<p className="text-xs text-slate-600 mt-1">دلیل: {mission.cancelReason}</p>)}
            {mission.status === 'Completed' && (<div className="mt-3 flex items-center gap-2 text-xs text-green-600">
                <CheckCircle2 className="w-4 h-4"/>
                تحویل با OTP تأیید شد — {new Intl.NumberFormat('fa-IR').format(mission.photosUploaded)} عکس ثبت شد
              </div>)}
          </div>)}
      </div>
    </div>);
}
function InfoItem({ icon, label, value }) {
    return (<div className="rounded-xl bg-slate-50 p-3">
      <div className="flex items-center gap-1 text-xs text-slate-400 mb-1">
        {icon}
        {label}
      </div>
      <p className="text-sm font-semibold text-slate-700">{value}</p>
    </div>);
}
function ActionButton({ onClick, loading, icon, label, color, }) {
    const cls = color === 'blue'
        ? 'bg-blue-600 hover:bg-blue-700'
        : 'bg-green-600 hover:bg-green-700';
    return (<button onClick={onClick} disabled={loading} className={`w-full flex items-center justify-center gap-2 rounded-xl ${cls} px-4 py-3.5 text-base font-bold text-white transition disabled:opacity-50 active:scale-[0.98]`}>
      {loading ? <Loader2 className="w-5 h-5 animate-spin"/> : icon}
      {label}
    </button>);
}
