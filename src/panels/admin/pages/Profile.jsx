import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Loader2, LogOut, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api, upload } from '../api';
import { useAdmin } from '../auth';
import { Page } from '../components/ui';
import InitialAvatar from '../../../shared/InitialAvatar';
import LogoutConfirm from '../../../shared/components/LogoutConfirm';
import { when } from '../format';

export default function Profile() {
  const { user, setUser, logout } = useAdmin();
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [profile, setProfile] = useState(null);
  const [password, setPassword] = useState({ currentPassword: '', nextPassword: '' });
  const [mfa, setMfa] = useState(null);
  const [mfaCode, setMfaCode] = useState('');
  const shown = profile || user;
  useEffect(() => { if (user) setProfile(user); }, [user]);

  async function onFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      const data = await upload('/auth/avatar', file);
      setUser(data);
      toast.success('تصویر پروفایل ذخیره شد');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function removePhoto() {
    setBusy(true);
    try {
      const data = await api('/auth/avatar', { method: 'DELETE' });
      setUser(data);
      toast.success('تصویر پروفایل حذف شد');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page title="پروفایل اپراتور">
      <article className="card" style={{ padding: 20, display: 'grid', gap: 16, maxWidth: 560 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <InitialAvatar
            src={user?.avatarUrl}
            firstName={user?.firstName}
            lastName={user?.lastName}
            fullName={user?.fullName}
            size={88}
          />
          <div>
            <h2 style={{ margin: 0 }}>{user?.fullName}</h2>
            <p className="muted" style={{ margin: '6px 0 0' }}>{user?.roleLabels?.join(' · ')}</p>
            <p className="muted" style={{ margin: '4px 0 0' }}>{user?.username}</p>
          </div>
        </div>
        <p>آخرین ورود: {when(user?.lastLoginAt)}</p>
        <div className="form-grid">
          <input className="field" placeholder="نام و نام خانوادگی" value={shown?.fullName || ''} onChange={(e) => setProfile({ ...shown, fullName: e.target.value })} />
          <input className="field" placeholder="موبایل" value={shown?.phone || ''} onChange={(e) => setProfile({ ...shown, phone: e.target.value })} />
          <input className="field" placeholder="ایمیل" value={shown?.email || ''} onChange={(e) => setProfile({ ...shown, email: e.target.value })} />
          <input className="field" placeholder="شرکت" value={shown?.company || ''} onChange={(e) => setProfile({ ...shown, company: e.target.value })} />
          <input className="field" placeholder="کد ملی" value={shown?.nationalId || ''} onChange={(e) => setProfile({ ...shown, nationalId: e.target.value })} />
          <input className="field" placeholder="کد پستی" value={shown?.postalCode || ''} onChange={(e) => setProfile({ ...shown, postalCode: e.target.value })} />
          <button type="button" className="btn" onClick={async () => {
            try {
              const data = await api('/auth/profile', { method: 'PATCH', body: shown });
              setUser(data);
              toast.success('حساب ذخیره شد');
            } catch (error) { toast.error(error.message); }
          }}>ذخیره حساب</button>
        </div>
        <div className="form-grid">
          <input className="field" type="password" placeholder="رمز فعلی" value={password.currentPassword} onChange={(e) => setPassword({ ...password, currentPassword: e.target.value })} />
          <input className="field" type="password" placeholder="رمز تازه" value={password.nextPassword} onChange={(e) => setPassword({ ...password, nextPassword: e.target.value })} />
          <button type="button" className="btn secondary" onClick={async () => {
            try { await api('/auth/password', { method: 'POST', body: password }); toast.success('رمز تغییر کرد'); setPassword({ currentPassword: '', nextPassword: '' }); }
            catch (error) { toast.error(error.message); }
          }}>تغییر رمز</button>
        </div>
        <div className="form-grid">
          <p>ورود دومرحله‌ای: {shown?.mfaEnabled ? 'فعال' : 'خاموش'}</p>
          <button type="button" className="btn secondary" onClick={async () => {
            try { setMfa(await api('/auth/mfa/setup', { method: 'POST', body: {} })); }
            catch (error) { toast.error(error.message); }
          }}>آماده‌سازی کد</button>
          {mfa && <p className="muted">کلید: {mfa.secret}<br />{mfa.otpauth}</p>}
          <input className="field" placeholder="کد ۶ رقمی" value={mfaCode} onChange={(e) => setMfaCode(e.target.value)} />
          <button type="button" className="btn" onClick={async () => {
            try { const data = await api('/auth/mfa/enable', { method: 'POST', body: { code: mfaCode } }); setUser(data); toast.success('فعال شد'); }
            catch (error) { toast.error(error.message); }
          }}>فعال‌سازی</button>
          <button type="button" className="btn secondary" onClick={async () => {
            try { const data = await api('/auth/mfa/disable', { method: 'POST', body: { currentPassword: password.currentPassword, code: mfaCode } }); setUser(data); toast.success('خاموش شد'); }
            catch (error) { toast.error(error.message); }
          }}>خاموش کردن</button>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }} onClick={() => fileRef.current?.click()} disabled={busy}>
            {busy ? <Loader2 size={16} /> : <Camera size={16} />} {user?.avatarUrl ? 'تغییر تصویر' : 'افزودن تصویر'}
          </button>
          {user?.avatarUrl && (
            <button type="button" className="btn secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }} onClick={removePhoto} disabled={busy}>
              <Trash2 size={16} /> حذف تصویر
            </button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={onFile} />
        <p className="muted">اگر تصویری نباشد، حرف اول نام و نام خانوادگی روی پس‌زمینه گرادیانی نمایش داده می‌شود.</p>
        <button
          type="button"
          className="btn secondary"
          style={{ color: 'var(--alamut-crit)', borderColor: 'rgba(180, 35, 24, 0.35)' }}
          onClick={() => setConfirmLogout(true)}
        >
          <LogOut size={16} /> خروج از حساب
        </button>
      </article>
      <LogoutConfirm
        open={confirmLogout}
        onCancel={() => setConfirmLogout(false)}
        onConfirm={async () => { setConfirmLogout(false); await logout(); navigate('/admin/login'); }}
        message="آیا مطمئن هستید که می‌خواهید از مرکز عملیات خارج شوید؟ برای ادامه کار باید دوباره وارد شوید."
      />
    </Page>
  );
}
