import { missionStatusLabels, statusOrder } from '@/driverFormat';
import { Check, Circle } from 'lucide-react';
export function StatusTimeline({ currentStatus, }) {
    const currentIdx = statusOrder.indexOf(currentStatus);
    return (<div className="space-y-0">
      {statusOrder.map((status, idx) => {
            const isDone = idx < currentIdx;
            const isCurrent = idx === currentIdx;
            const isFuture = idx > currentIdx;
            return (<div key={status} className="flex items-start gap-3">
            {/* Line + dot */}
            <div className="flex flex-col items-center">
              <div className={`flex h-7 w-7 items-center justify-center rounded-full border-2 transition-all ${isDone
                    ? 'border-green-500 bg-green-500 text-white'
                    : isCurrent
                        ? 'border-blue-500 bg-blue-50 text-blue-600'
                        : 'border-slate-200 bg-white text-slate-300'}`}>
                {isDone ? (<Check className="w-3.5 h-3.5"/>) : isCurrent ? (<span className="h-2.5 w-2.5 rounded-full bg-blue-500 animate-pulse"/>) : (<Circle className="w-3 h-3"/>)}
              </div>
              {idx < statusOrder.length - 1 && (<div className={`w-0.5 h-6 ${isDone ? 'bg-green-400' : 'bg-slate-200'}`}/>)}
            </div>
            {/* Label */}
            <div className="pt-1 pb-5">
              <span className={`text-sm font-medium ${isDone
                    ? 'text-slate-600'
                    : isCurrent
                        ? 'text-blue-600'
                        : 'text-slate-400'}`}>
                {missionStatusLabels[status]}
              </span>
              {isCurrent && (<p className="text-xs text-blue-500 mt-0.5">در حال انجام...</p>)}
            </div>
          </div>);
        })}
    </div>);
}
