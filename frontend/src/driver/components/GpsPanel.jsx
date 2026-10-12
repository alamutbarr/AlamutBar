import { GpsBadge } from './GpsBadge';
import { MapPin, Upload, Radio } from 'lucide-react';
export function GpsPanel({ status, queueSize, onToggle, onSync, currentPoint, }) {
    const isActive = status === 'active';
    return (<div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-700">
          <Radio className="w-4 h-4 text-blue-500"/>
          موقعیت‌یاب (GPS)
        </h3>
        <GpsBadge status={status}/>
      </div>

      {currentPoint && (<div className="mb-3 flex items-center gap-2 rounded-xl bg-slate-50 p-2.5 text-xs text-slate-600">
          <MapPin className="w-4 h-4 text-blue-500"/>
          <span className="tabular-nums">
            lat: {currentPoint.lat.toFixed(5)}, lng: {currentPoint.lng.toFixed(5)}
          </span>
        </div>)}

      <div className="mb-3 flex items-center justify-between text-xs">
        <span className="text-slate-500">نقاط در صف آفلاین</span>
        <span className="rounded-lg bg-slate-100 px-2 py-0.5 font-bold tabular-nums text-slate-700">
          {new Intl.NumberFormat('fa-IR').format(queueSize)} / ۵٬۰۰۰
        </span>
      </div>

      {status !== 'active' && (<div className="mb-3 rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-700">
          <p className="font-medium mb-1">راهنمای رفع مشکل:</p>
          <ul className="list-disc list-inside space-y-0.5 text-amber-600">
            <li>روشن بودن Location گوشی را بررسی کنید</li>
            <li>اینترنت گوشی را چک کنید</li>
            <li>Battery Optimization را غیرفعال کنید</li>
          </ul>
        </div>)}

      <div className="flex gap-2">
        <button onClick={onToggle} className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-medium transition active:scale-95 ${isActive
            ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
            : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'}`}>
          <Radio className="w-4 h-4"/>
          {isActive ? 'خاتمه ارسال' : 'فعال‌سازی GPS'}
        </button>
        <button onClick={onSync} disabled={queueSize === 0} className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95">
          <Upload className="w-4 h-4"/>
          همگام‌سازی
        </button>
      </div>
    </div>);
}
