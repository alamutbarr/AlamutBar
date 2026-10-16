// frontend/src/driver/missionSearch/MissionSearchEntry.jsx
//
// بلوک مشترک بالای صفحات «مأموریت‌ها» و «پیشنهادها»: دو گزینه‌ی مستقل
// (بارهای اطراف من / جست‌وجوی دستی) + نمایش بخش انتخاب‌شده. این کامپوننت
// state داخلی خودش را دارد تا در هر دو صفحه بدون تداخل قابل استفاده باشد.

import { useState } from 'react';
import { MapPin, Search, ChevronDown } from 'lucide-react';
import { NearbyMissionsPanel } from './NearbyMissionsPanel';
import { ManualSearchPanel } from './ManualSearchPanel';

const MODES = {
  NONE: 'none',
  NEARBY: 'nearby',
  MANUAL: 'manual',
};

export function MissionSearchEntry({ onMissionClick }) {
  const [mode, setMode] = useState(MODES.NONE);

  return (
    <div className="mb-5">
      <div className="grid grid-cols-2 gap-3 mb-4">
        <ModeCard
          icon={<MapPin className="w-5 h-5" />}
          title="بارهای اطراف من"
          description="بر اساس موقعیت فعلی شما"
          active={mode === MODES.NEARBY}
          color="blue"
          onClick={() => setMode(mode === MODES.NEARBY ? MODES.NONE : MODES.NEARBY)}
        />
        <ModeCard
          icon={<Search className="w-5 h-5" />}
          title="جست‌وجوی دستی"
          description="انتخاب مبدأ و مقصد دلخواه"
          active={mode === MODES.MANUAL}
          color="emerald"
          onClick={() => setMode(mode === MODES.MANUAL ? MODES.NONE : MODES.MANUAL)}
        />
      </div>

      {mode === MODES.NEARBY && (
        <NearbyMissionsPanel onMissionClick={onMissionClick} onSwitchToManual={() => setMode(MODES.MANUAL)} />
      )}
      {mode === MODES.MANUAL && <ManualSearchPanel onMissionClick={onMissionClick} />}
    </div>
  );
}

function ModeCard({ icon, title, description, active, color, onClick }) {
  const colorClasses = {
    blue: active ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-700',
    emerald: active ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-700',
  };
  const iconColorClasses = {
    blue: active ? 'bg-blue-500 text-white' : 'bg-blue-50 text-blue-500',
    emerald: active ? 'bg-emerald-500 text-white' : 'bg-emerald-50 text-emerald-500',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 rounded-2xl border-2 p-3.5 text-right transition-all active:scale-[0.98] ${colorClasses[color]}`}
    >
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconColorClasses[color]}`}>
        {icon}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-bold truncate">{title}</span>
        <span className="block text-[11px] text-slate-400 truncate">{description}</span>
      </span>
      <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${active ? 'rotate-180' : ''}`} />
    </button>
  );
}
