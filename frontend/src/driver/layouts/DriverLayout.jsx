import { useEffect, useState } from 'react';
import { LayoutDashboard, ListTodo, User, Truck, LogOut, AlertTriangle, } from 'lucide-react';
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

    return (<div className="isolate relative min-h-screen flex bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* پس‌زمینه‌ی تزئینی: باعث می‌شود افکت شیشه‌ای عمق و رنگ واقعی بگیرد */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-blue-300/40 blur-3xl"/>
        <div className="absolute top-1/3 -left-28 h-80 w-80 rounded-full bg-violet-300/35 blur-3xl"/>
        <div className="absolute -bottom-24 right-1/4 h-72 w-72 rounded-full bg-emerald-200/40 blur-3xl"/>
      </div>

      {/* Desktop Sidebar */}
      <aside className="glass-strong anim-fade hidden lg:flex w-64 flex-col fixed inset-y-0 right-0 border-l border-white/60">
        <div className="flex items-center gap-3 p-5 border-b border-white/50 anim-text d-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-md shadow-blue-500/30">
            <Truck className="w-5 h-5 text-white"/>
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-800">الموت‌بار</h1>
            <p className="text-xs text-slate-500">{driverName}</p>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const active = current === item.key;
            return (<button key={item.key} onClick={() => onNavigate(item.key)} style={{ animationDelay: `${90 + index * 70}ms` }} className={`anim-slide w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-300 ${active
                    ? 'glass border-white/70 text-blue-700 shadow-sm shadow-blue-500/10'
                    : 'text-slate-600 hover:bg-white/50 hover:text-slate-800'}`}>
                <Icon className={`w-5 h-5 transition-colors ${active ? 'text-blue-600' : 'text-slate-400'}`}/>
                {item.label}
                {active && (<span className="mr-auto h-1.5 w-1.5 rounded-full bg-blue-500 anim-pop d-2"/>)}
              </button>);
        })}
        </nav>

        <div className="p-3 border-t border-white/50">
          <button onClick={() => setConfirmLogout(true)} className="anim-slide w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-red-600 transition-all duration-300 hover:bg-red-50/70" style={{ animationDelay: '330ms' }}>
            <LogOut className="w-5 h-5"/>
            خروج از حساب کاربری
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 lg:mr-64">
        {/* Mobile top bar */}
        <header className="glass-strong lg:hidden sticky top-0 z-30 flex items-center justify-between border-b border-white/60 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600">
              <Truck className="w-4 h-4 text-white"/>
            </div>
            <span className="text-sm font-bold text-slate-800">الموت‌بار</span>
          </div>
          <button onClick={() => setConfirmLogout(true)} title="خروج از حساب کاربری" className="rounded-lg p-1.5 text-slate-500 transition hover:bg-red-50 hover:text-red-600">
            <LogOut className="w-5 h-5"/>
          </button>
        </header>

        <main className="pb-20 lg:pb-6">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="glass-strong lg:hidden fixed bottom-0 inset-x-0 z-30 border-t border-white/60 grid grid-cols-3">
        {navItems.map((item) => {
            const Icon = item.icon;
            const active = current === item.key;
            return (<button key={item.key} onClick={() => onNavigate(item.key)} className={`relative flex flex-col items-center gap-1 py-2.5 transition-all duration-300 ${active ? 'text-blue-600' : 'text-slate-400'}`}>
              <Icon className="w-5 h-5"/>
              <span className="text-[10px] font-medium">{item.label}</span>
              {active && (<span className="absolute top-0 h-0.5 w-8 rounded-full bg-blue-500 anim-fade"/>)}
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
