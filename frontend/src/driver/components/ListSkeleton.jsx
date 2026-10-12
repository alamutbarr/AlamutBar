export function ListSkeleton({ count = 3 }) {
    return (<div className="space-y-3 p-4">
      {Array.from({ length: count }).map((_, i) => (<div key={i} className="animate-pulse rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="h-5 w-24 rounded-lg bg-slate-200"/>
            <div className="h-5 w-16 rounded-full bg-slate-200"/>
          </div>
          <div className="h-4 w-full rounded-lg bg-slate-100 mb-2"/>
          <div className="h-4 w-2/3 rounded-lg bg-slate-100 mb-3"/>
          <div className="flex gap-2">
            <div className="h-8 w-20 rounded-lg bg-slate-100"/>
            <div className="h-8 w-20 rounded-lg bg-slate-100"/>
          </div>
        </div>))}
    </div>);
}
