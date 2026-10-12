import { Inbox } from 'lucide-react';
export function EmptyState({ icon, title, description, action, }) {
    return (<div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        {icon ?? <Inbox className="w-8 h-8"/>}
      </div>
      <h3 className="text-base font-semibold text-slate-700">{title}</h3>
      {description && (<p className="mt-1.5 max-w-xs text-sm text-slate-500">{description}</p>)}
      {action && <div className="mt-4">{action}</div>}
    </div>);
}
