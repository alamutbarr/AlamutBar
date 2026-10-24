import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAdmin } from '../auth';
import BrandMark from '../../owner/components/common/BrandMark';

const schema = z.object({
  username: z.string().min(3, 'نام کاربری را وارد کنید'),
  password: z.string().min(8, 'رمز عبور را وارد کنید'),
});

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAdmin();
  const [error, setError] = useState('');
  const form = useForm({ resolver: zodResolver(schema) });

  const submit = form.handleSubmit(async (values) => {
    setError('');
    try {
      await login(values.username, values.password);
      navigate('/admin');
    } catch (err) {
      setError(err.message);
    }
  });

  return (
    <div className="admin-app" style={{ display: 'grid', placeItems: 'center', padding: 20 }}>
      <form className="card" style={{ width: 'min(420px, 100%)', padding: 24, display: 'grid', gap: 10 }} onSubmit={submit}>
        <BrandMark subtitle="ورود اپراتور" />
        <h1 style={{ fontSize: 28, margin: '18px 0 6px' }}>نام کاربری و رمز</h1>
        <p className="muted">ورود اپراتورها با نام کاربری و رمز عبور است.</p>
        <input className="field" autoComplete="username" placeholder="نام کاربری" {...form.register('username')} />
        <input className="field" type="password" autoComplete="current-password" placeholder="رمز عبور" {...form.register('password')} />
        {error && <p style={{ color: 'var(--alamut-crit)' }}>{error}</p>}
        <button className="btn" type="submit" style={{ width: '100%', marginTop: 8 }}>ورود</button>
      </form>
    </div>
  );
}
