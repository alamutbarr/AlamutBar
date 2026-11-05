import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, upload } from '../api';
import { useInspector } from '../auth';
import InitialAvatar from '../../../shared/InitialAvatar';
import LogoutConfirm from '../../../shared/components/LogoutConfirm';

export default function Profile() {
  const { user, setUser, logout } = useInspector();
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [confirmLogout, setConfirmLogout] = useState(false);

  async function onFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const data = await upload('/me/avatar', file);
      setUser(data);
      setMessage('تصویر پروفایل ذخیره شد.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function removePhoto() {
    setBusy(true);
    setError('');
    try {
      const data = await api('/me/avatar', { method: 'DELETE' });
      setUser(data);
      setMessage('تصویر پروفایل حذف شد.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="inspector-card">
      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
        <InitialAvatar
          src={user?.avatarUrl}
          firstName={user?.firstName}
          lastName={user?.lastName}
          fullName={user?.fullName}
          size={84}
        />
        <div>
          <h1 style={{ margin: 0 }}>{user?.fullName}</h1>
          <p className="inspector-muted">{user?.phone}</p>
        </div>
      </div>
      <p className="inspector-muted">اگر تصویری نباشد، حرف اول نام و نام خانوادگی روی پس‌زمینه گرادیانی نمایش داده می‌شود.</p>
      {message && <p className="inspector-muted">{message}</p>}
      {error && <p style={{ color: 'var(--alamut-crit)' }}>{error}</p>}
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={onFile} />
      <button type="button" className="inspector-btn" disabled={busy} onClick={() => fileRef.current?.click()}>
        {user?.avatarUrl ? 'تغییر تصویر' : 'افزودن تصویر'}
      </button>
      {user?.avatarUrl && (
        <button type="button" className="inspector-btn secondary" disabled={busy} onClick={removePhoto}>
          حذف تصویر
        </button>
      )}
      <button
        type="button"
        className="inspector-btn secondary"
        style={{ color: 'var(--alamut-crit)', borderColor: 'rgba(180, 35, 24, 0.35)' }}
        onClick={() => setConfirmLogout(true)}
      >
        خروج از حساب
      </button>
      <LogoutConfirm
        open={confirmLogout}
        onCancel={() => setConfirmLogout(false)}
        onConfirm={async () => { setConfirmLogout(false); await logout(); navigate('/inspector/login'); }}
        message="آیا مطمئن هستید که می‌خواهید از پنل متصدی خارج شوید؟ برای ادامه کار باید دوباره وارد شوید."
      />
    </article>
  );
}
