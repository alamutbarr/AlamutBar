import { LayoutDashboard, ListTodo, User } from 'lucide-react';

const navItems = [
  { key: 'dashboard', label: 'داشبورد', icon: LayoutDashboard },
  { key: 'missions', label: 'مأموریت‌ها', icon: ListTodo },
  { key: 'profile', label: 'پروفایل', icon: User },
];

export function DriverLayout({ current, onNavigate, driverName, children }) {
  return (
    <div className="panel-canvas isolate relative min-h-screen lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]" dir="rtl">
      <aside className="brand-rail hidden lg:sticky lg:top-0 lg:flex lg:h-screen w-full flex-col">
        <div className="px-5 pb-2 pt-6">
          <div className="flex items-center gap-3 text-[#f7f6f0]">
            <span className="block h-9 w-9 shrink-0" aria-hidden="true">
              <svg viewBox="0 0 40 40" fill="none" className="h-full w-full stroke-current" strokeWidth="1.5" strokeLinejoin="bevel">
                <path d="M5 28.5 17.5 8l7.1 11.8L30 10l5 8.7v9.8H5Z" />
                <path d="M5 28.5h30M12 21l4.6 7.5M24.4 20l5.6 8.5" />
              </svg>
            </span>
            <div className="leading-tight">
              <h1 className="text-[15px] font-extrabold tracking-[0.16em]">ALAMUT</h1>
              <p className="mt-1 text-[11px] text-[#f7f6f0]/70">{driverName || 'پنل راننده'}</p>
            </div>
          </div>
          <p className="mt-5 text-[11px] font-medium text-[#d7b56d]">حمل بار، با خیال راحت</p>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = current === item.key;
            return (
              <button
                key={item.key}
                onClick={() => onNavigate(item.key)}
                className={`w-full flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                  active ? 'bg-white/10 font-bold text-[#f7f6f0]' : 'text-[#f7f6f0]/75 hover:bg-white/5'
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>

      <div className="min-w-0 w-full">
        <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between bg-[#10282b] px-4 py-3 text-[#f7f6f0]">
          <div className="flex items-center gap-2">
            <span className="block h-8 w-8 text-[#f7f6f0]" aria-hidden="true">
              <svg viewBox="0 0 40 40" fill="none" className="h-full w-full stroke-current" strokeWidth="1.6" strokeLinejoin="bevel">
                <path d="M5 28.5 17.5 8l7.1 11.8L30 10l5 8.7v9.8H5Z" />
                <path d="M5 28.5h30" />
              </svg>
            </span>
            <div className="leading-tight">
              <span className="block text-sm font-extrabold tracking-[0.14em]">ALAMUT</span>
              <span className="text-[11px] text-[#f7f6f0]/80">{driverName || 'پنل راننده'}</span>
            </div>
          </div>
        </header>

        <main className="pb-[calc(4.75rem+env(safe-area-inset-bottom))] lg:pb-6">{children}</main>
      </div>

      <nav className="panel-dock lg:hidden fixed inset-x-3 bottom-3 z-30 grid grid-cols-3 p-1 pb-[max(0.4rem,env(safe-area-inset-bottom))]">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = current === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              className={`flex flex-col items-center gap-1 rounded-md py-2.5 transition-colors ${
                active ? 'bg-[#e1f3f0] font-bold text-[#087f8c]' : 'text-[#526d70]'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[11px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
