import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutGrid,
  PackagePlus,
  History,
  Bell,
  ShieldAlert,
  User,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { getMyNotifications } from "../../api/notification.api";
import Avatar from "./Avatar";
import BrandMark from "./BrandMark";

const links = [
  { to: "/owner/dashboard", label: "داشبورد", icon: LayoutGrid },
  { to: "/owner/create-shipment", label: "ثبت بار جدید", icon: PackagePlus },
  { to: "/owner/shipments", label: "بارهای من", icon: History },
  { to: "/owner/notifications", label: "اعلان‌ها", icon: Bell, badgeKey: "unread" },
  { to: "/owner/complaints", label: "ثبت شکایت", icon: ShieldAlert },
  { to: "/owner/profile", label: "پروفایل", icon: User },
];

export default function Sidebar({ onClose = () => {} }) {
  const { user } = useAuth();
  const location = useLocation();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const refreshUnread = () => {
      getMyNotifications()
        .then((items) => setUnread((items || []).filter((item) => !item.is_read).length))
        .catch(() => {});
    };
    refreshUnread();
    window.addEventListener('alamut:notifications', refreshUnread);
    return () => window.removeEventListener('alamut:notifications', refreshUnread);
  }, [location.pathname]);

  return (
    <>
      <aside className="brand-rail hidden h-full w-64 shrink-0 flex-col overflow-hidden lg:flex">
        <div className="px-5 pb-2 pt-6">
          <BrandMark light subtitle="صاحب کالا" />
          <p className="mt-5 text-[11px] font-medium text-[#d7b56d]">حمل بار، با خیال راحت</p>
        </div>

        <nav className="flex-1 space-y-1 px-3 pt-4">
          {links.map(({ to, label, icon: Icon, badgeKey }) => {
            const isActive = location.pathname === to;
            return (
              <NavLink
                key={to}
                to={to}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors ${
                  isActive
                    ? "bg-white/10 font-bold text-[#f7f6f0]"
                    : "text-[#f7f6f0]/75 hover:bg-white/5"
                }`}
              >
                <Icon size={18} strokeWidth={2} />
                <span className="flex-1">{label}</span>
                {badgeKey === "unread" && unread > 0 && (
                  <span className="tabular flex h-5 min-w-[20px] items-center justify-center rounded-md bg-[#159a9c] px-1 text-[11px] font-bold text-[#f7f6f0]">
                    {unread}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-3">
          <NavLink to="/owner/profile" onClick={onClose} className="mb-2 flex items-center gap-3 rounded-md px-3 py-2">
            <Avatar
              avatarUrl={user?.avatar_url}
              firstName={user?.first_name}
              lastName={user?.last_name}
            />
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-sm text-[#f7f6f0]">
                {user?.first_name
                  ? `${user.first_name} ${user.last_name}`
                  : user?.phone_number}
              </p>
            </div>
          </NavLink>
        </div>
      </aside>
    </>
  );
}
