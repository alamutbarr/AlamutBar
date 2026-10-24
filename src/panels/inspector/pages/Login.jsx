import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useInspector } from '../auth';
import BrandMark from '../../owner/components/common/BrandMark';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useInspector();
  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  async function send(event) {
    event.preventDefault();
    setError('');
    try {
      const data = await api('/auth/request-otp', { method: 'POST', body: { phone } });
      setCode(data.devOtpCode || '');
      setStep('code');
    } catch (err) {
      setError(err.message);
    }
  }

  async function verify(event) {
    event.preventDefault();
    setError('');
    try {
      await login(phone, code);
      navigate('/inspector');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="inspector-login">
      <header className="inspector-login-mobile">
        <BrandMark light subtitle="متصدی میدان" />
      </header>
      <aside className="inspector-login-brand brand-rail">
        <BrandMark light subtitle="حمل‌ونقل و لجستیک" />
        <div className="inspector-login-copy">
          <p style={{ color: '#d7b56d', fontSize: 11, margin: 0 }}>حمل بار، با خیال راحت</p>
          <h2>مسیر مطمئن،<span>حمل هوشمند.</span></h2>
          <p>مراجعه، چک‌لیست و عکس بار از همین صفحه ثبت می‌شود.</p>
        </div>
        <div className="glass-card" style={{ display: 'flex', gap: 32, padding: '16px 20px' }}>
          <div>
            <strong style={{ display: 'block', color: '#fff', fontSize: 20 }}>میدان</strong>
            <span style={{ fontSize: 12, color: 'rgba(247,246,240,.72)' }}>بازدید بار</span>
          </div>
          <div>
            <strong style={{ display: 'block', color: '#fff', fontSize: 20 }}>مدارک</strong>
            <span style={{ fontSize: 12, color: 'rgba(247,246,240,.72)' }}>کامل یا ناقص</span>
          </div>
        </div>
      </aside>
      <div className="inspector-login-form">
        <form onSubmit={step === 'phone' ? send : verify}>
          <h1 style={{ fontSize: 28, margin: '0 0 6px' }}>{step === 'phone' ? 'خوش اومدی' : 'کد تأیید'}</h1>
          <p className="inspector-muted">برای مراجعه میدانی با همان شماره‌ای که مرکز عملیات ثبت کرده وارد شوید.</p>
          {step === 'phone' ? (
            <input className="inspector-field" inputMode="tel" placeholder="0912xxxxxxx" value={phone} onChange={(event) => setPhone(event.target.value)} />
          ) : (
            <input className="inspector-field" inputMode="numeric" placeholder="کد پنج‌رقمی" value={code} onChange={(event) => setCode(event.target.value)} />
          )}
          {step === 'code' && code && <p>کد آزمایشی: <strong>{code}</strong></p>}
          {error && <p style={{ color: 'var(--alamut-crit)' }}>{error}</p>}
          <button className="inspector-btn" type="submit">ادامه</button>
        </form>
      </div>
    </div>
  );
}
