import { LayoutDashboard, ListTodo, User, Truck, LogOut, } from 'lucide-react';
const navItems = [
    { key: 'dashboard', label: 'داشبورد', icon: LayoutDashboard },
    { key: 'missions', label: 'مأموریت‌ها', icon: ListTodo },
    { key: 'profile', label: 'پروفایل', icon: User },
];
export function DriverLayout({ current, onNavigate, onLogout, driverName, children, }) {
    return (<div className="min-h-screen bg-slate-50 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col fixed inset-y-0 right-0 border-l border-slate-200 bg-white">
        <div className="flex items-center gap-3 p-5 border-b border-slate-200">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-md">
            <Truck className="w-5 h-5 text-white"/>
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-800">Xbar راننده</h1>
            <p className="text-xs text-slate-400">{driverName}</p>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = current === item.key;
            return (<button key={item.key} onClick={() => onNavigate(item.key)} className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${active
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-50'}`}>
                <Icon className={`w-5 h-5 ${active ? 'text-blue-600' : 'text-slate-400'}`}/>
                {item.label}
                {active && (<span className="mr-auto h-1.5 w-1.5 rounded-full bg-blue-500"/>)}
              </button>);
        })}
        </nav>

        <div className="p-3 border-t border-slate-200">
          <button onClick={onLogout} className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-red-600 transition hover:bg-red-50">
            <LogOut className="w-5 h-5"/>
            خروج
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 lg:mr-64">
        {/* Mobile top bar */}
        <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between bg-white border-b border-slate-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600">
              <Truck className="w-4 h-4 text-white"/>
            </div>
            <span className="text-sm font-bold text-slate-800">Xbar راننده</span>
          </div>
          <button onClick={onLogout} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <LogOut className="w-5 h-5"/>
          </button>
        </header>

        <main className="pb-20 lg:pb-6">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-slate-200 grid grid-cols-3">
        {navItems.map((item) => {
            const Icon = item.icon;
            const active = current === item.key;
            return (<button key={item.key} onClick={() => onNavigate(item.key)} className={`flex flex-col items-center gap-1 py-2.5 transition-all ${active ? 'text-blue-600' : 'text-slate-400'}`}>
              <Icon className="w-5 h-5"/>
              <span className="text-[10px] font-medium">{item.label}</span>
              {active && (<span className="absolute -top-px h-0.5 w-8 rounded-full bg-blue-500"/>)}
            </button>);
        })}
      </nav>
    </div>);
}
