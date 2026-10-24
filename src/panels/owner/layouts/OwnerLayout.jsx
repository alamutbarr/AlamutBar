import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Bell, History, LayoutGrid, LogOut, PackagePlus, ShieldAlert, User } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import Sidebar from '../components/common/Sidebar';
import BrandMark from '../components/common/BrandMark';
import { useAuth } from '../hooks/useAuth';

const MOBILE = [
  { to: '/owner/dashboard', label: 'خانه', icon: LayoutGrid, end: true },
  { to: '/owner/create-shipment', label: 'ثبت بار', icon: PackagePlus },
  { to: '/owner/shipments', label: 'بارها', icon: History },
  { to: '/owner/notifications', label: 'اعلان', icon: Bell },
];

const MORE = [
  { to: '/owner/complaints', label: 'ثبت شکایت', icon: ShieldAlert },
  { to: '/owner/profile', label: 'پروفایل', icon: User },
];

export default function OwnerLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [more, setMore] = useState(false);
  const name = user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user?.phone_number;

  return (
    <div className="panel-canvas flex h-screen overflow-hidden" dir="rtl">
      <Sidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <header className="z-30 flex items-center gap-3 bg-[#10282b] px-4 py-3 text-[#f7f6f0] lg:hidden">
        <BrandMark light subtitle="صاحب کالا" />
        <div className="flex-1" />
        {name && <span className="max-w-[8rem] truncate text-sm">{name}</span>}
      </header>
        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="w-full px-4 py-5 pb-28 sm:px-6 sm:py-8 lg:px-8 lg:pb-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
      <nav className="panel-dock fixed inset-x-3 bottom-3 z-40 flex gap-1 p-1 lg:hidden">
        {MOBILE.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `flex flex-1 flex-col items-center gap-1 rounded-md py-2 text-[11px] font-bold ${isActive ? 'bg-[#e1f3f0] text-[#087f8c]' : 'text-[#526d70]'}`}
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
        <button type="button" className="flex flex-1 flex-col items-center gap-1 rounded-md py-2 text-[11px] font-bold text-[#526d70]" onClick={() => setMore(true)}>
          بیشتر
        </button>
      </nav>
      {more && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" className="absolute inset-0 bg-[#10282b]/45" aria-label="بستن" onClick={() => setMore(false)} />
          <div className="absolute inset-x-3 bottom-3 rounded-md border border-[#d8e1dc] bg-[#f7f6f0] p-3 shadow-panel-lg">
            {MORE.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} onClick={() => setMore(false)} className="flex items-center gap-3 rounded-md px-3 py-3 text-sm font-bold text-[#17383b]">
                <Icon size={18} /> {label}
              </NavLink>
            ))}
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-md px-3 py-3 text-sm font-bold text-[#b42318]"
              onClick={() => { setMore(false); logout(); navigate('/owner/login'); }}
            >
              <LogOut size={18} /> خروج
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
