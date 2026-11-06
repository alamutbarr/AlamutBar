import { flagLabels, flagStyles } from '@/driverFormat';
import { AlertTriangle, Zap, Circle } from 'lucide-react';
export function FlagBadges({ flag }) {
    if (flag === 'normal') {
        return (<span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${flagStyles[flag]}`}>
        <Circle className="w-3 h-3"/>
        {flagLabels[flag]}
      </span>);
    }
    if (flag === 'sensitive') {
        return (<span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${flagStyles[flag]}`}>
        <AlertTriangle className="w-3 h-3"/>
        {flagLabels[flag]}
      </span>);
    }
    return (<span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${flagStyles[flag]}`}>
      <Zap className="w-3 h-3"/>
      {flagLabels[flag]}
    </span>);
}
