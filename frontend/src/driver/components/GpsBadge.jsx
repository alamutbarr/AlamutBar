import { MapPin, WifiOff, AlertCircle } from 'lucide-react';
const config = {
    active: {
        label: 'GPS فعال',
        cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        icon: MapPin,
    },
    issue: {
        label: 'مشکل ارتباط GPS',
        cls: 'bg-amber-50 text-amber-700 border-amber-200',
        icon: AlertCircle,
    },
    disconnected: {
        label: 'GPS قطع شده',
        cls: 'bg-red-50 text-red-700 border-red-200',
        icon: WifiOff,
    },
    offline_long: {
        label: 'آفلاین طولانی‌مدت',
        cls: 'bg-rose-100 text-rose-800 border-rose-300',
        icon: WifiOff,
    },
};
export function GpsBadge({ status }) {
    const c = config[status];
    const Icon = c.icon;
    return (<span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${c.cls}`}>
      <Icon className="w-3.5 h-3.5"/>
      {c.label}
      {status === 'active' && (<span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"/>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"/>
        </span>)}
    </span>);
}
export function GpsIcon({ status }) {
    const c = config[status];
    const Icon = c.icon;
    return (<span className={`inline-flex items-center justify-center rounded-lg p-1.5 ${c.cls}`}>
      <Icon className="w-4 h-4"/>
    </span>);
}
