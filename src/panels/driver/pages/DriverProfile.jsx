import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { User, Phone, CreditCard, Award, Calendar, ShieldCheck, ShieldAlert, Star, X, Camera, Trash2, Loader2, } from 'lucide-react';
import { getInitials, readAvatar, saveAvatar, removeAvatar, fileToAvatarDataUrl, } from '@/avatar';
import { isVerificationComplete } from '@/verification';
import { VerificationDocuments } from '@/components/VerificationDocuments';
export function DriverProfile({ driver, onLogout, onDriverUpdate }) {
    const location = useLocation();
    const verificationRef = useRef(null);
    const [verified, setVerified] = useState(() => isVerificationComplete(driver.id));
    const [showVerifyNotice, setShowVerifyNotice] = useState(false);
    const initials = getInitials(driver.name);
    const fileInputRef = useRef(null);
    const [avatar, setAvatar] = useState(() => readAvatar(driver.id));
    const [avatarBusy, setAvatarBusy] = useState(false);
    const [avatarError, setAvatarError] = useState('');
    // اگر راننده عوض شود، عکس ذخیره‌شده‌ی همان راننده بارگذاری می‌شود
    useEffect(() => {
        setAvatar(readAvatar(driver.id));
        setAvatarError('');
        setVerified(isVerificationComplete(driver.id));
    }, [driver.id]);

    // اگر از مسیر «قبول مأموریت» بدون احراز هویت به این صفحه منتقل شده باشیم،
    // اعلان اجباری‌بودن احراز هویت را نمایش می‌دهیم و به بخش مدارک می‌رویم.
    useEffect(() => {
        if (location.state?.verificationRequired) {
            setShowVerifyNotice(true);
            setTimeout(() => {
                verificationRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 150);
            window.history.replaceState({}, '');
        }
    }, [location.state]);
    const handlePickFile = () => {
        setAvatarError('');
        fileInputRef.current?.click();
    };
    const handleFileChange = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = ''; // اجازه‌ی انتخاب دوباره‌ی همان فایل
        if (!file)
            return;
        setAvatarBusy(true);
        setAvatarError('');
        try {
            const dataUrl = await fileToAvatarDataUrl(file);
            try {
                saveAvatar(driver.id, dataUrl);
            }
            catch {
                setAvatarError('ذخیره‌ی عکس در مرورگر ممکن نشد. حافظه‌ی مرورگر را آزاد کنید.');
                return;
            }
            setAvatar(dataUrl);
        }
        catch (error) {
            setAvatarError(error?.message || 'افزودن عکس ناموفق بود.');
        }
        finally {
            setAvatarBusy(false);
        }
    };
    const handleRemoveAvatar = () => {
        removeAvatar(driver.id);
        setAvatar(null);
        setAvatarError('');
    };
    return (<div className="w-full space-y-4 px-4 py-5 sm:px-6 lg:px-8">
      {/* اعلان اجباری‌بودن احراز هویت (وقتی از مسیر قبول مأموریت آمده باشیم) */}
      {showVerifyNotice && (<div className="anim-text rounded-2xl border border-rose-200/70 bg-rose-50/70 p-4 backdrop-blur">
        <div className="flex items-start gap-2.5">
          <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0 mt-0.5"/>
          <div className="flex-1">
            <p className="text-sm font-bold text-rose-700">احراز هویت فرایندی اجباری است</p>
            <p className="mt-1 text-xs leading-6 text-slate-600">
              برای گرفتن بار باید ابتدا مدارک الزامی (گواهینامه رانندگی و عکس شخصی با کارت) را بارگذاری کنید.
            </p>
          </div>
          <button type="button" onClick={() => setShowVerifyNotice(false)} className="shrink-0 text-slate-400 hover:text-slate-600 transition">
            <X className="w-4 h-4"/>
          </button>
        </div>
      </div>)}

      {/* Profile header */}
      <div className="glass-card anim-text rounded-2xl p-5">
        <div className="flex items-center gap-4">
          {/* عکس پروفایل: در صورت نبود عکس، حروف اول نام به صورت انگلیسی و بزرگ */}
          <div className="relative shrink-0">
            <button type="button" onClick={handlePickFile} title={avatar ? 'تغییر عکس پروفایل' : 'افزودن عکس پروفایل'} className="group relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl shadow-lg shadow-blue-500/20 ring-1 ring-black/5">
              {avatar ? (<img src={avatar} alt="عکس پروفایل" className="h-full w-full object-cover"/>) : initials ? (<span className="flex h-full w-full select-none items-center justify-center bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-600 text-2xl font-extrabold tracking-wide text-white">
                  {initials}
                </span>) : (<span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-600 text-white">
                  <User className="w-8 h-8"/>
                </span>)}
              <span className="absolute inset-0 flex items-center justify-center bg-slate-900/45 text-white opacity-0 transition group-hover:opacity-100">
                {avatarBusy ? (<Loader2 className="w-5 h-5 animate-spin"/>) : (<Camera className="w-5 h-5"/>)}
              </span>
            </button>

            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange}/>

            {avatar && !avatarBusy && (<button type="button" onClick={handleRemoveAvatar} title="حذف عکس" className="absolute -bottom-1.5 -left-1.5 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-rose-500 shadow-sm transition hover:bg-rose-50">
                <Trash2 className="w-3.5 h-3.5"/>
              </button>)}
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-slate-800">{driver.name}</h2>
            <div className="mt-1.5 flex items-center gap-2">
              {verified ? (<span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 border border-green-200">
                  <ShieldCheck className="w-3 h-3"/>
                  احراز هویت شده
                </span>) : (<span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 border border-amber-200">
                  <ShieldAlert className="w-3 h-3"/>
                  نیازمند احراز هویت
                </span>)}
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-700 border border-violet-200">
                <Star className="w-3 h-3"/>
                {new Intl.NumberFormat('fa-IR', { minimumFractionDigits: 1 }).format(driver.rating)}
              </span>
            </div>
          </div>
        </div>

        {/* افزودن / تغییر / حذف عکس پروفایل */}
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          <button type="button" onClick={handlePickFile} disabled={avatarBusy} className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-blue-700 disabled:opacity-60 active:scale-[0.98]">
            {avatarBusy ? (<Loader2 className="w-4 h-4 animate-spin"/>) : (<Camera className="w-4 h-4"/>)}
            {avatar ? 'تغییر عکس پروفایل' : 'افزودن عکس پروفایل'}
          </button>
          {avatar && !avatarBusy && (<button type="button" onClick={handleRemoveAvatar} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-600 transition hover:bg-rose-50 hover:text-rose-600 active:scale-[0.98]">
              <Trash2 className="w-4 h-4"/>
              حذف عکس
            </button>)}
        </div>

        {avatarError && (<p className="mt-2 text-xs font-medium text-rose-600">{avatarError}</p>)}
      </div>

      {/* Stats */}
      <div className="anim-text d-1 grid grid-cols-2 gap-3">
        <StatBox icon={<Award className="w-5 h-5"/>} label="تعداد مأموریت‌ها" value={new Intl.NumberFormat('fa-IR').format(driver.totalMissions)} color="blue"/>
        <StatBox icon={<Calendar className="w-5 h-5"/>} label="تاریخ عضویت" value={driver.joinedDate} color="slate"/>
      </div>

      {/* Personal info */}
      <div className="glass-card anim-text d-2 rounded-2xl p-4">
        <h3 className="text-sm font-bold text-slate-700 mb-3">اطلاعات هویتی</h3>
        <div className="space-y-2">
          <InfoRow icon={<User className="w-4 h-4"/>} label="نام و نام خانوادگی" value={driver.name}/>
          <InfoRow icon={<Phone className="w-4 h-4"/>} label="شماره موبایل" value={driver.mobile} ltr/>
          <InfoRow icon={<CreditCard className="w-4 h-4"/>} label="کد ملی" value={driver.nationalCode} ltr/>
          <InfoRow icon={<Award className="w-4 h-4"/>} label="شماره گواهینامه" value={driver.licenseNumber} ltr/>
        </div>
      </div>

      {/* Verification documents */}
      <div ref={verificationRef} className="glass-card anim-text d-3 rounded-2xl p-4">
        <h3 className="text-sm font-bold text-slate-700 mb-3">وضعیت مدارک</h3>
        <VerificationDocuments driverId={driver.id} onVerifiedChange={setVerified} onDriverUpdate={onDriverUpdate} />
      </div>

      {/* Logout */}
      <button onClick={onLogout} className="anim-text d-4 w-full flex items-center justify-center gap-2 rounded-xl border-2 border-red-200/80 bg-red-50/70 px-4 py-3.5 text-base font-bold text-red-600 backdrop-blur transition hover:bg-red-100/90 active:scale-[0.98]">
        <X className="w-5 h-5"/>
        خروج از حساب
      </button>
    </div>);
}
function StatBox({ icon, label, value, color }) {
    const cls = color === 'blue' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-600';
    return (<div className="glass-card rounded-2xl p-4">
      <div className={`inline-flex items-center justify-center rounded-xl ${cls} p-2 mb-2`}>
        {icon}
      </div>
      <p className="text-lg font-bold text-slate-800">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </div>);
}
function InfoRow({ icon, label, value, ltr }) {
    return (<div className="flex items-center justify-between rounded-xl border border-white/60 bg-white/55 px-4 py-2.5">
      <span className="flex items-center gap-2 text-sm text-slate-500">
        {icon}
        {label}
      </span>
      <span className="text-sm font-semibold text-slate-700" dir={ltr ? 'ltr' : 'rtl'}>{value}</span>
    </div>);
}
