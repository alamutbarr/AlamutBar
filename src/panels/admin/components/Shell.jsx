import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Bell, ClipboardList, LayoutGrid, LogOut, Map, Moon, Settings, Shield, Sun, Truck, Users } from 'lucide-react';
import { toast } from 'sonner';
import BrandMark from '../../owner/components/common/BrandMark';
import { api, getAccess } from '../api';
import { useAdmin } from '../auth';

const LINKS = [
  { to: '/admin', end: true, label: 'داشبورد', icon: LayoutGrid, perm: 'dashboard', mobile: true },
  { to: '/admin/orders', label: 'سفارش‌ها', icon: ClipboardList, perm: 'orders.read', mobile: true },
  { to: '/admin/map', label: 'نقشه', icon: Map, perm: 'map', mobile: true },
  { to: '/admin/alerts', label: 'هشدارها', icon: Bell, perm: 'alerts.read', mobile: true },
  { to: '/admin/drivers', label: 'رانندگان', icon: Truck, perm: 'drivers.read' },
  { to: '/admin/inspections', label: 'بازرسی', icon: Shield, perm: 'inspections' },
  { to: '/admin/customers', label: 'مشتریان', icon: Users, perm: 'owners.read' },
  { to: '/admin/complaints', label: 'تیکت‌ها', icon: Bell, perm: 'complaints' },
  { to: '/admin/reports', label: 'گزارش‌ها', icon: ClipboardList, perm: 'reports.operations' },
  { to: '/admin/settings', label: 'تنظیمات', icon: Settings, perm: 'settings.manage' },
  { to: '/admin/admins', label: 'اپراتورها', icon: Users, perm: 'admins.manage' },
  { to: '/admin/audit', label: 'اقدامات', icon: ClipboardList, perm: 'audit.read' },
];

export default function Shell() {
  const { user, can, logout } = useAdmin();
  const navigate = useNavigate();
  const [theme, setTheme] = useState(localStorage.getItem('alamut_admin_theme') || 'light');
  const [alerts, setAlerts] = useState(user?.openAlerts || 0);
  const [more, setMore] = useState(false);
  const visible = LINKS.filter((item) => can(item.perm));

  useEffect(() => {
    const token = getAccess();
    if (!token) return undefined;
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const socket = new WebSocket(`${protocol}://${window.location.host}/ws/admin?token=${token}`);
    socket.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      if (payload.type === 'alert') {
        setAlerts((count) => count + 1);
        toast.error(payload.alert.message);
      }
      if (payload.type === 'alert-resolved') setAlerts((count) => Math.max(0, count - 1));
    };
    return () => socket.close();
  }, []);

  const mobile = visible.filter((item) => item.mobile).slice(0, 4);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('alamut_admin_theme', next);
  };

  return (
    <div className="admin-app" data-theme={theme}>
      <aside className="admin-side brand-rail">
        <div className="admin-side-brand">
          <BrandMark light subtitle="مرکز عملیات" />
          <p className="admin-kicker">حمل بار، با خیال راحت</p>
        </div>
        <nav>
          {visible.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
              <item.icon size={18} /> {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="admin-side-foot">
          <strong>{user?.fullName}</strong>
          <div className="muted">{user?.roleLabels?.join(' · ')}</div>
          <div className="admin-side-actions">
            <button type="button" className="btn secondary bell" onClick={() => navigate('/admin/alerts')} aria-label="هشدارها">
              <Bell size={18} />
              {alerts > 0 && <i>{alerts.toLocaleString('fa-IR')}</i>}
            </button>
            <button type="button" className="btn secondary" onClick={toggleTheme} aria-label="تغییر تم">
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button type="button" className="btn secondary" onClick={async () => { await logout(); navigate('/admin/login'); }}>خروج</button>
          </div>
        </div>
      </aside>
      <div className="admin-body">
        <header className="admin-top">
          <span className="admin-mobile-brand"><BrandMark light subtitle="مرکز عملیات" /></span>
          <div style={{ flex: 1 }} />
          <button type="button" className="btn secondary bell" onClick={() => navigate('/admin/alerts')} aria-label="هشدارها">
            <Bell size={18} />
            {alerts > 0 && <i>{alerts.toLocaleString('fa-IR')}</i>}
          </button>
          <button type="button" className="btn secondary admin-mobile-brand" onClick={toggleTheme} aria-label="تغییر تم">
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button type="button" className="btn secondary admin-mobile-brand" onClick={async () => { await logout(); navigate('/admin/login'); }} aria-label="خروج"><LogOut size={18} /></button>
        </header>
        <main className="admin-main"><Outlet /></main>
      </div>
      <nav className="admin-bottom">
        {mobile.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `bottom-link${isActive ? ' active' : ''}`}>
            <item.icon size={18} />
          </NavLink>
        ))}
        <button type="button" className="bottom-link" onClick={() => setMore(true)}>بیشتر</button>
      </nav>
      {more && (
        <div className="modal-layer">
          <button type="button" className="modal-scrim" onClick={() => setMore(false)} aria-label="بستن" />
          <div className="modal-card">
            {visible.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className="nav-link" onClick={() => setMore(false)}>{item.label}</NavLink>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
