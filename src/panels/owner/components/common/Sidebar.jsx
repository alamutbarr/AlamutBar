import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutGrid,
  PackagePlus,
  History,
  Bell,
  ShieldAlert,
  LogOut,
  User,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { getMyNotifications } from "../../api/notification.api";
import Avatar from "./Avatar";
import Modal from "./Modal";
import Button from "./Button";

const links = [
  { to: "/owner/dashboard", label: "داشبورد", icon: LayoutGrid },
  { to: "/owner/create-shipment", label: "ثبت بار جدید", icon: PackagePlus },
  { to: "/owner/shipments", label: "بارهای من", icon: History },
  { to: "/owner/notifications", label: "اعلان‌ها", icon: Bell, badgeKey: "unread" },
  { to: "/owner/complaints", label: "ثبت شکایت", icon: ShieldAlert },
  { to: "/owner/profile", label: "پروفایل", icon: User },
];

export default function Sidebar({ onClose = () => {} }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [unread, setUnread] = useState(0);
  const [logoutOpen, setLogoutOpen] = useState(false);

  useEffect(() => {
    getMyNotifications()
      .then((items) => setUnread(items.filter((i) => !i.is_read).length))
      .catch(() => {});
  }, []);

  // خروج واقعی فقط بعد از تأیید در Modal انجام می‌شود
  const handleLogout = () => {
    setLogoutOpen(false);
    logout();
    navigate("/owner/login");
  };

  return (
    <>
      <aside className="hidden h-full w-64 shrink-0 flex-col overflow-hidden border-l border-[#d8e1dc] bg-white/75 text-[#17383b] backdrop-blur lg:flex">
        <div className="px-5 py-5">
          <p className="text-xs text-[#526d70]">میانبرها</p>
        </div>

        <nav className="relative flex-1 space-y-1 px-3">
          {links.map(({ to, label, icon: Icon, badgeKey }) => {
            const isActive = location.pathname === to;
            return (
              <NavLink
                key={to}
                to={to}
                onClick={onClose}
                className={`relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-colors ${
                  isActive
                    ? "bg-[#e1f3f0] font-bold text-[#087f8c]"
                    : "text-[#17383b] hover:bg-[#f7f6f0]"
                }`}
              >
                <Icon size={18} strokeWidth={2} className="relative" />
                <span className="relative flex-1">{label}</span>
                {badgeKey === "unread" && unread > 0 && (
                  <span className="tabular relative flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#087f8c] px-1 text-[11px] font-bold text-[#f7f6f0]">
                    {unread}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="relative border-t border-[#d8e1dc] p-3">
          <div className="mb-2 flex items-center gap-3 rounded-lg px-3 py-2">
            <Avatar
              avatarUrl={user?.avatar_url}
              firstName={user?.first_name}
              lastName={user?.last_name}
            />
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-sm text-[#17383b]">
                {user?.first_name
                  ? `${user.first_name} ${user.last_name}`
                  : user?.phone_number}
              </p>
            </div>
          </div>
          <button
            onClick={() => setLogoutOpen(true)}
            className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-[#526d70] transition-colors hover:bg-[#fdeceb] hover:text-[#b42318]"
          >
            <LogOut size={18} strokeWidth={2} />
            خروج از حساب
          </button>
        </div>
      </aside>

      <Modal
        open={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        title="خروج از حساب"
        footer={
          <>
            <Button variant="ghost" onClick={() => setLogoutOpen(false)}>
              انصراف
            </Button>
            <Button
              variant="danger"
              className="!bg-red-50 hover:!bg-red-100"
              onClick={handleLogout}
            >
              خروج از حساب
            </Button>
          </>
        }
      >
        آیا مطمئنی که می‌خواهی از اکانتت خارج شوی؟
      </Modal>
    </>
  );
}
