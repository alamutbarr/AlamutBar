import { useCountdown, formatCountdown } from '@/driver/hooks/useCountdown';
import { Clock } from 'lucide-react';
export function OfferTimer({ expiresAt }) {
    const { remaining, expired } = useCountdown(expiresAt);
    if (expired) {
        return (<div className="flex items-center gap-1.5 text-xs text-rose-600 font-medium">
        <Clock className="w-3.5 h-3.5"/>
        منقضی شد
      </div>);
    }
    const isUrgent = remaining < 60_000;
    return (<div className={`flex items-center gap-1.5 text-xs font-medium tabular-nums ${isUrgent ? 'text-rose-600' : 'text-slate-500'}`}>
      <Clock className={`w-3.5 h-3.5 ${isUrgent ? 'animate-pulse text-rose-500' : ''}`}/>
      {formatCountdown(remaining)}
    </div>);
}
