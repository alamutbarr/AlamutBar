import { User, Phone, CreditCard, Award, Calendar, Truck, ShieldCheck, ShieldAlert, Clock, Star, CheckCircle2, X, } from 'lucide-react';
export function DriverProfile({ driver, vehicles, onLogout, }) {
    const verified = driver.verifiedStatus === 'verified';
    return (<div className="max-w-2xl mx-auto p-4 lg:p-6 space-y-4">
      {/* Profile header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/20">
            <User className="w-8 h-8"/>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-slate-800">{driver.name}</h2>
            <p className="text-sm text-slate-500" dir="ltr">{driver.mobile}</p>
            <div className="mt-1.5 flex items-center gap-2">
              {verified ? (<span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 border border-green-200">
                  <ShieldCheck className="w-3 h-3"/>
                  احراز هویت شده
                </span>) : (<span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 border border-amber-200">
                  <ShieldAlert className="w-3 h-3"/>
                  در انتظار تأیید
                </span>)}
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-700 border border-violet-200">
                <Star className="w-3 h-3"/>
                {new Intl.NumberFormat('fa-IR', { minimumFractionDigits: 1 }).format(driver.rating)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatBox icon={<Award className="w-5 h-5"/>} label="تعداد مأموریت‌ها" value={new Intl.NumberFormat('fa-IR').format(driver.totalMissions)} color="blue"/>
        <StatBox icon={<Calendar className="w-5 h-5"/>} label="تاریخ عضویت" value={driver.joinedDate} color="slate"/>
      </div>

      {/* Personal info */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-bold text-slate-700 mb-3">اطلاعات هویتی</h3>
        <div className="space-y-2">
          <InfoRow icon={<User className="w-4 h-4"/>} label="نام و نام خانوادگی" value={driver.name}/>
          <InfoRow icon={<Phone className="w-4 h-4"/>} label="شماره موبایل" value={driver.mobile} ltr/>
          <InfoRow icon={<CreditCard className="w-4 h-4"/>} label="کد ملی" value={driver.nationalCode} ltr/>
          <InfoRow icon={<Award className="w-4 h-4"/>} label="شماره گواهینامه" value={driver.licenseNumber} ltr/>
        </div>
      </div>

      {/* Verification status */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-bold text-slate-700 mb-3">وضعیت مدارک</h3>
        <div className="space-y-2">
          <VerifyRow label="احراز هویت" status={driver.verifiedStatus}/>
          <VerifyRow label="گواهینامه رانندگی" status={driver.verifiedStatus}/>
          {vehicles.map((v) => (<VerifyRow key={v.id} label={`کارت خودرو ${v.typeName}`} status={v.verifiedStatus}/>))}
        </div>
      </div>

      {/* Vehicles summary */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
          <Truck className="w-4 h-4 text-blue-500"/>
          خودروهای ثبت‌شده
        </h3>
        <div className="space-y-2">
          {vehicles.map((v) => (<div key={v.id} className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
              <div>
                <p className="text-sm font-medium text-slate-700">{v.typeName}</p>
                <p className="text-xs text-slate-500" dir="ltr">{v.plate}</p>
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${v.active
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                {v.active ? 'فعال' : 'غیرفعال'}
              </span>
            </div>))}
        </div>
      </div>

      {/* Session info */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-400"/>
          نشست (Session)
        </h3>
        <p className="text-xs text-slate-500">
          نشست راننده بدون انقضای کوتاه‌مدت فعال است تا در مسیر نیازی به ورود مجدد نباشد.
          برای خروج، دکمه زیر را بزنید.
        </p>
      </div>

      {/* Logout */}
      <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3.5 text-base font-bold text-red-600 transition hover:bg-red-100 active:scale-[0.98]">
        <X className="w-5 h-5"/>
        خروج از حساب
      </button>
    </div>);
}
function StatBox({ icon, label, value, color }) {
    const cls = color === 'blue' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-600';
    return (<div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`inline-flex items-center justify-center rounded-xl ${cls} p-2 mb-2`}>
        {icon}
      </div>
      <p className="text-lg font-bold text-slate-800">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </div>);
}
function InfoRow({ icon, label, value, ltr }) {
    return (<div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2.5">
      <span className="flex items-center gap-2 text-sm text-slate-500">
        {icon}
        {label}
      </span>
      <span className="text-sm font-semibold text-slate-700" dir={ltr ? 'ltr' : 'rtl'}>{value}</span>
    </div>);
}
function VerifyRow({ label, status }) {
    const config = {
        verified: { icon: <CheckCircle2 className="w-4 h-4"/>, cls: 'text-green-600', text: 'تأیید شده' },
        pending: { icon: <Clock className="w-4 h-4"/>, cls: 'text-amber-600', text: 'در انتظار' },
        rejected: { icon: <X className="w-4 h-4"/>, cls: 'text-red-600', text: 'رد شده' },
    };
    const c = config[status];
    return (<div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2.5">
      <span className="text-sm text-slate-600">{label}</span>
      <span className={`flex items-center gap-1 text-xs font-medium ${c.cls}`}>
        {c.icon}
        {c.text}
      </span>
    </div>);
}
