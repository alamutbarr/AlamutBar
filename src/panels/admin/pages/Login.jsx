import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '../api';
import { useAdmin } from '../auth';
import BrandMark from '../../owner/components/common/BrandMark';

const phoneSchema = z.object({
  phone: z.string().min(10, 'شماره موبایل را کامل وارد کنید'),
});
const codeSchema = z.object({
  code: z.string().min(4, 'کد تأیید را وارد کنید'),
});

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAdmin();
  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState('');
  const [devCode, setDevCode] = useState('');
  const [error, setError] = useState('');
  const phoneForm = useForm({ resolver: zodResolver(phoneSchema) });
  const codeForm = useForm({ resolver: zodResolver(codeSchema) });

  const send = phoneForm.handleSubmit(async (values) => {
    setError('');
    try {
      const data = await api('/auth/request-otp', { method: 'POST', body: values });
      setPhone(values.phone);
      setDevCode(data.devOtpCode || '');
      if (data.devOtpCode) codeForm.setValue('code', data.devOtpCode);
      setStep('code');
    } catch (err) {
      setError(err.message);
    }
  });

  const verify = codeForm.handleSubmit(async (values) => {
    setError('');
    try {
      await login(phone, values.code);
      navigate('/admin');
    } catch (err) {
      setError(err.message);
    }
  });

  return (
    <div className="admin-app" style={{ display: 'grid', placeItems: 'center', padding: 20 }}>
      <form className="card" style={{ width: 'min(420px, 100%)', padding: 24 }} onSubmit={step === 'phone' ? send : verify}>
        <BrandMark subtitle="ورود اپراتور" />
        <h1 style={{ fontSize: 28, margin: '18px 0 6px' }}>{step === 'phone' ? 'شماره موبایل' : 'کد تأیید'}</h1>
        <p className="muted">ورود همه اپراتورها با پیامک یک‌بارمصرف است.</p>
        {step === 'phone' ? (
          <input className="field" placeholder="۰۹۱۲..." {...phoneForm.register('phone')} />
        ) : (
          <input className="field" inputMode="numeric" placeholder="کد پنج‌رقمی" {...codeForm.register('code')} />
        )}
        {devCode && <p>کد آزمایشی: <strong className="tabular">{devCode}</strong></p>}
        {error && <p style={{ color: 'var(--alamut-crit)' }}>{error}</p>}
        <button className="btn" type="submit" style={{ width: '100%', marginTop: 8 }}>ادامه</button>
      </form>
    </div>
  );
}
