import { missionStatusLabels } from '@/driverFormat';
const statusColors = {
    Offered: 'bg-blue-50 text-blue-700 border-blue-200',
    Accepted: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    EnRouteToPickup: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    ArrivedPickup: 'bg-violet-50 text-violet-700 border-violet-200',
    LoadingChecks: 'bg-violet-50 text-violet-700 border-violet-200',
    WaybillIssued: 'bg-teal-50 text-teal-700 border-teal-200',
    InTransit: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    NearDestination: 'bg-amber-50 text-amber-700 border-amber-200',
    POD: 'bg-orange-50 text-orange-700 border-orange-200',
    Completed: 'bg-green-50 text-green-700 border-green-200',
    Declined: 'bg-rose-50 text-rose-700 border-rose-200',
    Cancelled: 'bg-rose-50 text-rose-700 border-rose-200',
};
export function DriverStatusBadge({ status, size = 'md', }) {
    const cls = statusColors[status] || 'bg-slate-100 text-slate-700 border-slate-200';
    const sizeCls = size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1';
    return (<span className={`inline-flex items-center gap-1 rounded-full border font-medium ${cls} ${sizeCls}`}>
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-current opacity-70"/>
      {missionStatusLabels[status]}
    </span>);
}
