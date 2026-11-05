import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Loader2, LogOut, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api, upload } from '../api';
import { useAdmin } from '../auth';
import { Page } from '../components/ui';
import InitialAvatar from '../../../shared/InitialAvatar';
import { when } from '../format';

export default function Profile() {
  const { user, setUser, logout } = useAdmin();
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);

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
        <p>موبایل: {user?.phone || '—'}</p>
        <p>آخرین ورود: {when(user?.lastLoginAt)}</p>
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
          onClick={async () => { await logout(); navigate('/admin/login'); }}
        >
          <LogOut size={16} /> خروج از حساب
        </button>
      </article>
    </Page>
  );
}
