import { useEffect, useState } from 'react';
import { LayoutDashboard, ListTodo, User, LogOut, AlertTriangle, } from 'lucide-react';
const navItems = [
    { key: 'dashboard', label: 'داشبورد', icon: LayoutDashboard },
    { key: 'missions', label: 'مأموریت‌ها', icon: ListTodo },
    { key: 'profile', label: 'پروفایل', icon: User },
];
export function DriverLayout({ current, onNavigate, onLogout, driverName, children, }) {
    const [confirmLogout, setConfirmLogout] = useState(false);

    // بستن پنجره‌ی تأیید با کلید Escape
    useEffect(() => {
        if (!confirmLogout) return undefined;
        const onKeyDown = (event) => {
            if (event.key === 'Escape') setConfirmLogout(false);
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [confirmLogout]);

    return (<div className="isolate relative min-h-screen flex bg-[#f7f6f0]" dir="rtl">
      <aside className="hidden lg:flex w-64 flex-col fixed inset-y-0 right-0 border-l border-[#d8e1dc] bg-white/80 text-[#17383b] backdrop-blur">
        <div className="flex items-center gap-3 border-b border-[#d8e1dc] bg-[#087f8c] p-5 text-[#f7f6f0]">
          <span className="block h-9 w-9 shrink-0" aria-hidden="true">
            <svg viewBox="0 0 40 40" fill="none" className="h-full w-full stroke-current" strokeWidth="1.5" strokeLinejoin="bevel">
              <path d="M5 28.5 17.5 8l7.1 11.8L30 10l5 8.7v9.8H5Z" />
              <path d="M5 28.5h30M12 21l4.6 7.5M24.4 20l5.6 8.5" />
            </svg>
          </span>
          <div className="leading-tight">
            <h1 className="text-[15px] font-extrabold tracking-[0.16em]">ALAMUT</h1>
            <p className="mt-1 text-[11px] text-[#f7f6f0]/80">{driverName || 'پنل راننده'}</p>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = current === item.key;
            return (<button key={item.key} onClick={() => onNavigate(item.key)} className={`w-full flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-colors ${active
                    ? 'bg-[#e1f3f0] font-bold text-[#087f8c]'
                    : 'text-[#17383b] hover:bg-[#f7f6f0]'}`}>
                <Icon className={`w-5 h-5 ${active ? 'text-[#087f8c]' : 'text-[#526d70]'}`}/>
                {item.label}
              </button>);
        })}
        </nav>

        <div className="border-t border-[#d8e1dc] p-3">
          <button onClick={() => setConfirmLogout(true)} className="w-full flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-[#b42318] transition-colors hover:bg-[#fdeceb]">
            <LogOut className="w-5 h-5"/>
            خروج از حساب کاربری
          </button>
        </div>
      </aside>

      <div className="flex-1 lg:mr-64">
        <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between bg-[#087f8c] px-4 py-3 text-[#f7f6f0]">
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
          <button onClick={() => setConfirmLogout(true)} title="خروج از حساب کاربری" className="rounded-2xl border border-white/30 p-2 text-[#f7f6f0]">
            <LogOut className="w-5 h-5"/>
          </button>
        </header>

        <main className="pb-[calc(4.75rem+env(safe-area-inset-bottom))] lg:pb-6">{children}</main>
      </div>

      <nav className="lg:hidden fixed inset-x-3 bottom-3 z-30 grid grid-cols-3 rounded-[22px] border border-[#17383b]/10 bg-white/90 p-1.5 pb-[max(0.4rem,env(safe-area-inset-bottom))] shadow-panel backdrop-blur">
        {navItems.map((item) => {
            const Icon = item.icon;
            const active = current === item.key;
            return (<button key={item.key} onClick={() => onNavigate(item.key)} className={`flex flex-col items-center gap-1 rounded-2xl py-2.5 transition-colors ${active ? 'bg-[#e1f3f0] font-bold text-[#087f8c]' : 'text-[#526d70]'}`}>
              <Icon className="w-5 h-5"/>
              <span className="text-[11px] font-medium">{item.label}</span>
            </button>);
        })}
      </nav>

      {/* تأیید خروج از حساب کاربری */}
      {confirmLogout && (<div className="glass-overlay fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setConfirmLogout(false)} role="dialog" aria-modal="true">
          <div className="glass-strong anim-pop w-full max-w-sm rounded-2xl p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-3 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
                <AlertTriangle className="w-5 h-5"/>
              </span>
              <h3 className="text-base font-bold text-slate-800">خروج از حساب کاربری</h3>
            </div>
            <p className="mb-5 text-sm leading-7 text-slate-600">
              آیا مطمئن هستید که می‌خواهید از حساب کاربری خود خارج شوید؟
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setConfirmLogout(false)} className="anim-text d-1 order-2 rounded-xl border border-white/70 bg-white/60 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-white/85 sm:order-1">
                انصراف
              </button>
              <button type="button" onClick={() => { setConfirmLogout(false); onLogout(); }} className="anim-text d-2 order-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-red-500/25 transition hover:bg-red-700 active:scale-[0.98] sm:order-2">
                بله، خارج می‌شوم
              </button>
            </div>
          </div>
        </div>)}
    </div>);
}
