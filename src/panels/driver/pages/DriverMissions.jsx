import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MissionCard } from '@/components/MissionCard';
import { EmptyState } from '@/components/EmptyState';
import { ListSkeleton } from '@/components/ListSkeleton';
import { MissionSearchEntry, MODES } from '@/missionSearch/MissionSearchEntry';
import { isOffered, isMissionActive, isHistory, missionTabFromQuery } from '@/driverFormat';
import { Package, CheckCircle2, History, Inbox } from 'lucide-react';
const tabs = [
    { key: 'offered', label: 'پیشنهادها', icon: Package },
    { key: 'active', label: 'فعال', icon: CheckCircle2 },
    { key: 'history', label: 'سوابق', icon: History },
];
export function DriverMissions({ missions, loading, onMissionClick, }) {
    const [searchParams, setSearchParams] = useSearchParams();
    const tab = missionTabFromQuery(searchParams.get('tab'));
    const [searchMode, setSearchMode] = useState(MODES.NONE);
    const handleTabChange = (key) => {
        const next = missionTabFromQuery(key);
        // با جابه‌جایی بین تب‌ها، حالت جست‌وجوی مکانی را ریست می‌کنیم
        setSearchMode(MODES.NONE);
        setSearchParams({ tab: next }, { replace: true });
    };
    const filtered = missions.filter((m) => {
        if (tab === 'offered')
            return isOffered(m);
        if (tab === 'active')
            return isMissionActive(m);
        return isHistory(m);
    });
    const counts = {
        offered: missions.filter(isOffered).length,
        active: missions.filter(isMissionActive).length,
        history: missions.filter(isHistory).length,
    };
    return (<div className="w-full">
      {/* Page header */}
      <div className="px-4 sm:px-6 lg:px-8 pt-5 pb-3">
        <h2 className="anim-text text-xl font-bold text-slate-800 mb-3">مأموریت‌ها</h2>

        {/* Tabs (شیشه‌ای) */}
        <div className="glass anim-fade d-1 flex gap-1 rounded-2xl p-1">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (<button key={t.key} onClick={() => handleTabChange(t.key)} className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-medium transition-all duration-300 ${active
                    ? 'glass-strong text-blue-700 shadow-sm shadow-slate-900/5 ring-1 ring-blue-300/50'
                    : 'text-slate-500 hover:bg-white/45 hover:text-slate-700'}`}>
                <Icon className={`w-4 h-4 transition-colors duration-300 ${active ? 'text-blue-600' : 'text-slate-400'}`}/>
                {t.label}
                {counts[t.key] > 0 && (<span className={`anim-pop rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums transition-colors duration-300 ${active ? 'bg-blue-100 text-blue-700' : 'bg-slate-200/80 text-slate-600'}`}>
                    {new Intl.NumberFormat('fa-IR').format(counts[t.key])}
                  </span>)}
              </button>);
        })}
        </div>
      </div>

      {/* Content — با هر تغییر تب، محتوا دوباره با انیمیشن و دیلی نسبی وارد می‌شود */}
      <div className="px-4 sm:px-6 lg:px-8 pb-6">
        <div key={tab} className="anim-text">
          {/* جست‌وجوی مکانی فقط در تب «پیشنهادها» معنا دارد: این دو روش فقط روی
              بارهای هنوز پیشنهاد نشده (status=Offered) اعمال می‌شوند و مأموریت‌های
              فعال/سوابق راننده (تب‌های دیگر) را دست‌نخورده نگه می‌دارند. */}
          {tab === 'offered' && <MissionSearchEntry mode={searchMode} onModeChange={setSearchMode} onMissionClick={onMissionClick} />}

          {/* وقتی یکی از روش‌های جست‌وجوی مکانی فعال است، لیست عمومی پیشنهادها را
              مخفی می‌کنیم تا فقط بارهای منطبق با همان دسته نمایش داده شوند. */}
          {tab === 'offered' && searchMode !== MODES.NONE ? null : loading ? (<ListSkeleton count={3}/>) : filtered.length === 0 ? (<EmptyState icon={<Inbox className="w-8 h-8"/>} title={tab === 'offered'
                    ? 'پیشنهاد مأموریت جدیدی نیست'
                    : tab === 'active'
                        ? 'مأموریت فعالی ندارید'
                        : 'سابقه‌ای موجود نیست'} description={tab === 'offered'
                    ? 'پیشنهادهای جدید در اینجا نمایش داده می‌شوند'
                    : tab === 'active'
                        ? 'مأموریت‌های در حال انجام اینجا نمایش داده می‌شوند'
                        : 'مأموریت‌های پایان‌یافته و لغوشده در اینجا نمایش داده می‌شوند'}/>) : (<div className="space-y-3">
              {filtered.map((m, index) => (<div key={m.id} className="anim-text" style={{ animationDelay: `${Math.min(index, 6) * 55}ms` }}>
                  <MissionCard mission={m} onClick={() => onMissionClick(m)}/>
                </div>))}
            </div>)}
        </div>
      </div>
    </div>);
}
