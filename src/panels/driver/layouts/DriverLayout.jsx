import { useEffect } from 'react';
import { LayoutDashboard, ListTodo, User, Bell, Menu } from 'lucide-react';
import { useSidebarCollapsed } from '../../../shared/components/useSidebarCollapsed';
import { ThemeToggle } from '../../../shared/theme/PanelTheme';
import BrandMark from '../../owner/components/common/BrandMark';

const navItems = [
  { key: 'dashboard', label: 'داشبورد', icon: LayoutDashboard },
  { key: 'missions', label: 'مأموریت‌ها', icon: ListTodo },
  { key: 'notifications', label: 'اعلان‌ها', icon: Bell },
  { key: 'profile', label: 'پروفایل', icon: User },
];

export function DriverLayout({ current, onNavigate, driverName, children, notificationCount = 0 }) {
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

  const { collapsed, toggle } = useSidebarCollapsed('driver');

  return (
    <div className="panel-canvas flex h-dvh max-h-dvh overflow-hidden" dir="rtl">
      {!collapsed && (
      <aside className="brand-rail hidden h-full w-64 shrink-0 flex-col overflow-hidden lg:flex">
        <div className="px-5 pb-2 pt-6">
          <button
            type="button"
            onClick={toggle}
            className="mb-4 flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-[#f7f6f0]/80 hover:bg-white/10"
            aria-label="جمع کردن منو"
          >
            <Menu size={18} />
            جمع کردن منو
          </button>
          <BrandMark light subtitle={driverName || 'پنل راننده'} to="/driver/dashboard" />
          <p className="mt-5 text-[11px] font-medium text-[#d7b56d]">حمل بار، با خیال راحت</p>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = current === item.key;
            const badge = item.key === 'notifications' ? notificationCount : 0;
            return (
              <button
                key={item.key}
                onClick={() => onNavigate(item.key)}
                className={`w-full flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                  active ? 'bg-white/10 font-bold text-[#f7f6f0]' : 'text-[#f7f6f0]/75 hover:bg-white/5'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="flex-1 text-right">{item.label}</span>
                {badge > 0 && (
                  <span className="rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-[#10282b]">
                    {new Intl.NumberFormat('fa-IR').format(badge)}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-3">
          <div className="mb-1 px-1">
            <ThemeToggle />
          </div>
        </div>
      </aside>
      )}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {collapsed && (
          <div className="hidden items-center border-b border-[#d8e1dc] bg-white px-4 py-2 lg:flex">
            <button
              type="button"
              onClick={toggle}
              className="inline-flex items-center gap-2 rounded-md border border-[#d8e1dc] px-3 py-1.5 text-sm font-bold text-[#17383b]"
              aria-label="باز کردن منو"
            >
              <Menu size={18} />
              منو
            </button>
          </div>
        )}
        <header className="lg:hidden z-30 flex items-center justify-between bg-[#10282b] px-4 py-3 text-[#f7f6f0]">
          <BrandMark light subtitle={driverName || 'پنل راننده'} to="/driver/dashboard" />
          <div className="flex items-center gap-2">
            <ThemeToggle compact className="border-white/30 text-[#f7f6f0]" />
          </div>
        </header>

        <main className="min-w-0 flex-1 overflow-y-auto pb-[calc(4.75rem+env(safe-area-inset-bottom))] lg:pb-6">{children}</main>
      </div>

      <nav className="panel-dock lg:hidden fixed inset-x-3 bottom-3 z-30 grid grid-cols-4 p-1 pb-[max(0.4rem,env(safe-area-inset-bottom))]">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = current === item.key;
          const badge = item.key === 'notifications' ? notificationCount : 0;
          return (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              className={`relative flex flex-col items-center gap-1 rounded-md py-2.5 transition-colors ${
                active ? 'bg-[#e1f3f0] font-bold text-[#087f8c]' : 'text-[#526d70]'
              }`}
            >
              <Icon className="w-5 h-5" />
              {badge > 0 && (
                <span className="absolute left-1/2 top-1 -translate-x-1/2 translate-x-3 rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
                  {new Intl.NumberFormat('fa-IR').format(badge)}
                </span>
              )}
              <span className="text-[11px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
