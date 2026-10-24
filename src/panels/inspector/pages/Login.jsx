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
    <div className="inspector-app">
      <div className="inspector-frame" style={{ display: 'grid', alignContent: 'center', padding: 16 }}>
        <form className="inspector-card" onSubmit={step === 'phone' ? send : verify}>
          <BrandMark subtitle="ورود متصدی" />
          <h1 style={{ fontSize: 28, marginTop: 16 }}>{step === 'phone' ? 'شماره موبایل' : 'کد تأیید'}</h1>
          <p className="inspector-muted">برای مراجعه میدانی با همان شماره‌ای که مرکز عملیات ثبت کرده وارد شوید.</p>
          {step === 'phone' ? (
            <input className="inspector-field" inputMode="tel" placeholder="۰۹۱۲..." value={phone} onChange={(event) => setPhone(event.target.value)} />
          ) : (
            <input className="inspector-field" inputMode="numeric" placeholder="کد پنج‌رقمی" value={code} onChange={(event) => setCode(event.target.value)} />
          )}
          {step === 'code' && code && <p>کد آزمایشی: <strong>{code}</strong></p>}
          {error && <p style={{ color: 'var(--alamut-crit)' }}>{error}</p>}
          <button className="inspector-btn" type="submit" style={{ marginTop: 8 }}>ادامه</button>
        </form>
      </div>
    </div>
  );
}
