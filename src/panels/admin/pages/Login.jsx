import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '../api';
import { useAdmin } from '../auth';
import BrandMark from '../../owner/components/common/BrandMark';

const schema = z.object({
  username: z.string().min(3, 'نام کاربری را وارد کنید'),
  password: z.string().min(8, 'رمز عبور را وارد کنید'),
});

export default function Login() {
  const navigate = useNavigate();
  const { login, confirmMfa } = useAdmin();
  const [error, setError] = useState('');
  const [ticket, setTicket] = useState('');
  const [code, setCode] = useState('');
  const [recovery, setRecovery] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState('');
  const [nextPassword, setNextPassword] = useState('');
  const form = useForm({ resolver: zodResolver(schema) });

  const submit = form.handleSubmit(async (values) => {
    setError('');
    try {
      const result = await login(values.username, values.password);
      if (result?.mfaRequired) {
        setTicket(result.ticket);
        return;
      }
      navigate('/admin');
    } catch (err) {
      setError(err.message);
    }
  });

  async function submitCode(event) {
    event.preventDefault();
    setError('');
    try {
      await confirmMfa(ticket, code);
      navigate('/admin');
    } catch (err) {
      setError(err.message);
    }
  }

  async function sendRecovery(event) {
    event.preventDefault();
    setError('');
    try {
      const username = form.getValues('username');
      const data = await api('/auth/recovery', { method: 'POST', body: { username } });
      setRecovery(true);
      setError(data.devCode ? `کد بازیابی: ${data.devCode}` : 'کد بازیابی در صف ایمیل قرار گرفت.');
    } catch (err) {
      setError(err.message);
    }
  }

  async function finishRecovery(event) {
    event.preventDefault();
    setError('');
    try {
      await api('/auth/recovery/confirm', { method: 'POST', body: { username: form.getValues('username'), code: recoveryCode, password: nextPassword } });
      setRecovery(false);
      setError('رمز تازه ذخیره شد. دوباره وارد شوید.');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="admin-login">
      <header className="admin-login-mobile">
        <BrandMark light subtitle="مرکز عملیات" to="/admin" />
      </header>
      <aside className="admin-login-brand brand-rail">
        <BrandMark light subtitle="حمل‌ونقل و لجستیک" to="/admin" />
        <div className="admin-login-copy">
          <p className="admin-kicker">حمل بار، با خیال راحت</p>
          <h2>مسیر مطمئن،<span>حمل هوشمند.</span></h2>
          <p>سفارش، اعزام، نقشه و هشدار از همین‌جا دنبال می‌شود. ورود اپراتور با نام کاربری و رمز است.</p>
        </div>
        <div className="glass-card" style={{ display: 'flex', gap: 32, padding: '16px 20px' }}>
          <div>
            <strong style={{ display: 'block', color: '#fff', fontSize: 20 }}>۲۴/۷</strong>
            <span style={{ fontSize: 12, color: 'rgba(247,246,240,.72)' }}>پشتیبانی عملیات</span>
          </div>
          <div>
            <strong style={{ display: 'block', color: '#fff', fontSize: 20 }}>زنده</strong>
            <span style={{ fontSize: 12, color: 'rgba(247,246,240,.72)' }}>نقشه و هشدار</span>
          </div>
        </div>
      </aside>
      <div className="admin-login-form">
        {ticket ? (
          <form onSubmit={submitCode}>
            <h1>کد ورود دو مرحله‌ای</h1>
            <p className="muted">کد شش‌رقمی برنامه احراز هویت را وارد کنید.</p>
            <input className="field" inputMode="numeric" value={code} onChange={(event) => setCode(event.target.value)} placeholder="123456" />
            {error && <p style={{ color: 'var(--alamut-crit)' }}>{error}</p>}
            <button className="btn" type="submit" style={{ width: '100%', marginTop: 8 }}>تأیید</button>
          </form>
        ) : recovery ? (
          <form onSubmit={finishRecovery}>
            <h1>بازیابی حساب</h1>
            <input className="field" placeholder="کد ایمیل" value={recoveryCode} onChange={(event) => setRecoveryCode(event.target.value)} />
            <input className="field" type="password" placeholder="رمز تازه" value={nextPassword} onChange={(event) => setNextPassword(event.target.value)} />
            {error && <p style={{ color: 'var(--alamut-crit)' }}>{error}</p>}
            <button className="btn" type="submit" style={{ width: '100%', marginTop: 8 }}>ذخیره رمز</button>
          </form>
        ) : (
        <form onSubmit={submit}>
          <h1>خوش اومدی</h1>
          <p className="muted">نام کاربری و رمز عبور اپراتور را وارد کنید.</p>
          <label className="muted" htmlFor="admin-username">نام کاربری</label>
          <input id="admin-username" className="field" autoComplete="username" placeholder="admin" {...form.register('username')} />
          <label className="muted" htmlFor="admin-password">رمز عبور</label>
          <input id="admin-password" className="field" type="password" autoComplete="current-password" placeholder="رمز عبور" {...form.register('password')} />
          {error && <p style={{ color: 'var(--alamut-crit)' }}>{error}</p>}
          <button className="btn" type="submit" style={{ width: '100%', marginTop: 8 }}>ورود</button>
          <button className="btn secondary" type="button" style={{ width: '100%', marginTop: 8 }} onClick={sendRecovery}>بازیابی با ایمیل</button>
        </form>
        )}
      </div>
    </div>
  );
}
