import { useState } from 'react';
import { MissionCard } from '@/driver/components/MissionCard';
import { EmptyState } from '@/driver/components/EmptyState';
import { ListSkeleton } from '@/driver/components/ListSkeleton';
import { MissionSearchEntry, MODES } from '@/driver/missionSearch/MissionSearchEntry';
import { isOffered, isMissionActive, isHistory } from '@/driver/driverFormat';
import { Package, CheckCircle2, History, Inbox } from 'lucide-react';
const tabs = [
    { key: 'offered', label: 'پیشنهادها', icon: Package },
    { key: 'active', label: 'فعال', icon: CheckCircle2 },
    { key: 'history', label: 'سوابق', icon: History },
];
export function DriverMissions({ missions, loading, onMissionClick, }) {
    const [tab, setTab] = useState('offered');
    const [searchMode, setSearchMode] = useState(MODES.NONE);
    const handleTabChange = (key) => {
        setTab(key);
        // با جابه‌جایی بین تب‌ها، حالت جست‌وجوی مکانی را ریست می‌کنیم
        setSearchMode(MODES.NONE);
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
    return (<div className="max-w-2xl mx-auto">
      {/* Page header */}
      <div className="px-4 lg:px-6 pt-4 lg:pt-6 pb-3">
        <h2 className="text-xl font-bold text-slate-800 mb-3">مأموریت‌ها</h2>

        {/* Tabs */}
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (<button key={t.key} onClick={() => handleTabChange(t.key)} className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-medium transition-all ${active
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'}`}>
                <Icon className="w-4 h-4"/>
                {t.label}
                {counts[t.key] > 0 && (<span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${active ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'}`}>
                    {new Intl.NumberFormat('fa-IR').format(counts[t.key])}
                  </span>)}
              </button>);
        })}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 lg:px-6 pb-6">
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
            {filtered.map((m) => (<MissionCard key={m.id} mission={m} onClick={() => onMissionClick(m)}/>))}
          </div>)}
      </div>
    </div>);
}
