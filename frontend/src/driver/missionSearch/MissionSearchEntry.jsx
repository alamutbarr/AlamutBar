// frontend/src/driver/missionSearch/MissionSearchEntry.jsx
//
// بلوک مشترک بالای صفحات «مأموریت‌ها» و «پیشنهادها»: دو گزینه‌ی مستقل
// (بارهای اطراف من / جست‌وجوی دستی) + نمایش بخش انتخاب‌شده. این کامپوننت
// state داخلی خودش را ندارد؛ حالت انتخاب از والد می‌آید تا والد بتواند
// هنگام فعال بودن جست‌وجو، لیست عمومی پیشنهادها را مخفی کند.

import { MapPin, Search, ChevronDown } from 'lucide-react';
import { NearbyMissionsPanel } from './NearbyMissionsPanel';
import { ManualSearchPanel } from './ManualSearchPanel';

export const MODES = {
  NONE: 'none',
  NEARBY: 'nearby',
  MANUAL: 'manual',
};

export function MissionSearchEntry({ onMissionClick, mode, onModeChange }) {
  return (
    <div className="mb-5">
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="anim-text d-1">
          <ModeCard
            icon={<MapPin className="w-5 h-5" />}
            title="بارهای اطراف من"
            description="بر اساس موقعیت فعلی شما"
            active={mode === MODES.NEARBY}
            color="blue"
            onClick={() => onModeChange(mode === MODES.NEARBY ? MODES.NONE : MODES.NEARBY)}
          />
        </div>
        <div className="anim-text d-2">
          <ModeCard
            icon={<Search className="w-5 h-5" />}
            title="جست‌وجوی دستی"
            description="انتخاب مبدأ و مقصد دلخواه"
            active={mode === MODES.MANUAL}
            color="emerald"
            onClick={() => onModeChange(mode === MODES.MANUAL ? MODES.NONE : MODES.MANUAL)}
          />
        </div>
      </div>

      {mode === MODES.NEARBY && (
        <div className="anim-text">
          <NearbyMissionsPanel onMissionClick={onMissionClick} onSwitchToManual={() => onModeChange(MODES.MANUAL)} />
        </div>
      )}
      {mode === MODES.MANUAL && (
        <div className="anim-text">
          <ManualSearchPanel onMissionClick={onMissionClick} />
        </div>
      )}
    </div>
  );
}

function ModeCard({ icon, title, description, active, color, onClick }) {
  const colorClasses = {
    blue: active
      ? 'glass-strong ring-2 ring-blue-400/60 text-blue-700'
      : 'glass-soft text-slate-700 hover:bg-white/70',
    emerald: active
      ? 'glass-strong ring-2 ring-emerald-400/60 text-emerald-700'
      : 'glass-soft text-slate-700 hover:bg-white/70',
  };
  const iconColorClasses = {
    blue: active ? 'bg-blue-500 text-white' : 'bg-blue-50 text-blue-500',
    emerald: active ? 'bg-emerald-500 text-white' : 'bg-emerald-50 text-emerald-500',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-2xl p-3.5 text-right transition-all duration-300 active:scale-[0.98] ${colorClasses[color]}`}
    >
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors duration-300 ${iconColorClasses[color]}`}>
        {icon}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-bold truncate">{title}</span>
        <span className="block text-[11px] text-slate-400 truncate">{description}</span>
      </span>
      <ChevronDown className={`w-4 h-4 shrink-0 transition-transform duration-300 ${active ? 'rotate-180' : ''}`} />
    </button>
  );
}
