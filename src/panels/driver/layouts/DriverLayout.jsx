import { useEffect, useState } from 'react';
import { LayoutDashboard, ListTodo, User, LogOut, AlertTriangle, } from 'lucide-react';
import { ThemeToggle } from '../../../shared/theme/PanelTheme';
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

    useEffect(() => {
        const html = document.documentElement;
        const body = document.body;
        const prevHtml = html.style.overflow;
        const prevBody = body.style.overflow;
        html.style.overflow = 'hidden';
        body.style.overflow = 'hidden';
        return () => {
            html.style.overflow = prevHtml;
            body.style.overflow = prevBody;
        };
    }, []);

    return (<div className="panel-canvas flex h-dvh max-h-dvh overflow-hidden" dir="rtl">
      <aside className="brand-rail hidden h-full w-64 shrink-0 flex-col overflow-hidden lg:flex">
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
            return (<button key={item.key} onClick={() => onNavigate(item.key)} className={`w-full flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${active
                    ? 'bg-white/10 font-bold text-[#f7f6f0]'
                    : 'text-[#f7f6f0]/75 hover:bg-white/5'}`}>
                <Icon className="h-5 w-5"/>
                {item.label}
              </button>);
        })}
        </nav>

        <div className="border-t border-white/10 p-3">
          <div className="mb-1 px-1">
            <ThemeToggle />
          </div>
          <button onClick={() => setConfirmLogout(true)} className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-[#f7f6f0]/70 transition-colors hover:bg-white/5 hover:text-[#f7f6f0]">
            <LogOut className="w-5 h-5"/>
            خروج از حساب کاربری
          </button>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="lg:hidden z-30 flex items-center justify-between bg-[#10282b] px-4 py-3 text-[#f7f6f0]">
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
          <div className="flex items-center gap-2">
            <ThemeToggle compact className="border-white/30 text-[#f7f6f0]" />
            <button onClick={() => setConfirmLogout(true)} title="خروج از حساب کاربری" className="rounded-md border border-white/30 p-2 text-[#f7f6f0]">
              <LogOut className="w-5 h-5"/>
            </button>
          </div>
        </header>

        <main className="min-w-0 flex-1 overflow-y-auto pb-[calc(4.75rem+env(safe-area-inset-bottom))] lg:pb-6">{children}</main>
      </div>

      <nav className="panel-dock lg:hidden fixed inset-x-3 bottom-3 z-30 grid grid-cols-3 p-1 pb-[max(0.4rem,env(safe-area-inset-bottom))]">
        {navItems.map((item) => {
            const Icon = item.icon;
            const active = current === item.key;
            return (<button key={item.key} onClick={() => onNavigate(item.key)} className={`flex flex-col items-center gap-1 rounded-md py-2.5 transition-colors ${active ? 'bg-[#e1f3f0] font-bold text-[#087f8c]' : 'text-[#526d70]'}`}>
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
              <button type="button" onClick={() => setConfirmLogout(false)} className="anim-text d-1 order-2 rounded-md border border-[#d8e1dc] bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-[#f7f6f0] sm:order-1">
                انصراف
              </button>
              <button type="button" onClick={() => { setConfirmLogout(false); onLogout(); }} className="anim-text d-2 order-1 rounded-md bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-700 sm:order-2">
                بله، خارج می‌شوم
              </button>
            </div>
          </div>
        </div>)}
    </div>);
}
