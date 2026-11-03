import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAdmin } from '../auth';
import { when } from '../format';
import { Badge, Page, SkeletonRows } from '../components/ui';
import OwnerDocuments, { hasPendingOwnerDocuments } from '../components/OwnerDocuments';

const VERIFICATION_LABELS = {
  VERIFIED: 'تأیید شده',
  REJECTED: 'رد شده',
  PENDING: 'در انتظار تأیید',
};

function tone(status) {
  if (status === 'VERIFIED') return 'ok';
  if (status === 'REJECTED') return 'crit';
  return 'warn';
}

export default function Customers() {
  const navigate = useNavigate();
  const { can } = useAdmin();
  const [query, setQuery] = useState({ page: 1, q: '', verification: '' });
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = () => {
    const params = new URLSearchParams({ page: String(query.page), limit: '20' });
    if (query.q) params.set('q', query.q);
    if (query.verification) params.set('verification', query.verification);
    setError('');
    return api(`/customers?${params}`).then(setData);
  };

  useEffect(() => {
    load().catch((err) => setError(err.message || 'فهرست مشتریان بارگذاری نشد.'));
  }, [query]);

  if (error) return <Page title="مشتریان"><p style={{ color: 'var(--alamut-crit)' }}>{error}</p></Page>;
  if (!data) return <SkeletonRows />;

  const pending = (data.items || []).filter(hasPendingOwnerDocuments);
  const canReview = can('owners.documents');

  return (
    <Page title="مشتریان (صاحبان کالا)">
      <div className="form-grid" style={{ marginBottom: 12 }}>
        <input className="field" placeholder="نام، شرکت یا کد ملی" value={query.q} onChange={(event) => setQuery({ ...query, page: 1, q: event.target.value })} />
        <select className="select" value={query.verification} onChange={(event) => setQuery({ ...query, page: 1, verification: event.target.value })}>
          <option value="">همه وضعیت‌های مدارک</option>
          <option value="PENDING">در انتظار تأیید</option>
          <option value="VERIFIED">تأیید شده</option>
          <option value="REJECTED">رد شده</option>
        </select>
      </div>

      <section style={{ marginBottom: 20 }}>
        <h2 style={{ marginTop: 0 }}>تأیید مدارک مشتریان</h2>
        <p className="muted">مدارک بارگذاری‌شده را مثل احراز هویت رانندگان همین‌جا تأیید یا رد کنید.</p>
        {pending.length === 0 && <p className="muted">در این صفحه مدرکی در انتظار تأیید نیست.</p>}
        <div style={{ display: 'grid', gap: 10 }}>
          {pending.map((owner) => (
            <article key={owner.id} className="card" style={{ padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <strong>{owner.companyName || owner.fullName}</strong>
                <button type="button" className="btn secondary" onClick={() => navigate(`/admin/customers/${owner.id}`)}>پرونده مشتری</button>
              </div>
              <p className="muted">{owner.fullName} — {owner.phone || 'بدون موبایل'} — کد ملی {owner.nationalId || '—'}</p>
              <Badge tone={tone(owner.verificationStatus)}>{VERIFICATION_LABELS[owner.verificationStatus] || 'در انتظار تأیید'}</Badge>
              <OwnerDocuments owner={owner} canReview={canReview} onReviewed={() => load().catch((err) => setError(err.message))} />
            </article>
          ))}
        </div>
      </section>

      <div className="card table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>مشتری</th>
              <th>شرکت</th>
              <th>موبایل</th>
              <th>کد ملی</th>
              <th>مدارک</th>
              <th>الزام متصدی</th>
              <th>ثبت</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((owner) => (
              <tr key={owner.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/admin/customers/${owner.id}`)}>
                <td>{owner.fullName || '—'}</td>
                <td>{owner.companyName || '—'}</td>
                <td>{owner.phone || '—'}</td>
                <td>{owner.nationalId || '—'}</td>
                <td><Badge tone={tone(owner.verificationStatus)}>{VERIFICATION_LABELS[owner.verificationStatus] || 'در انتظار تأیید'}</Badge></td>
                <td>{owner.requireInspector ? 'بله' : 'خیر'}</td>
                <td>{when(owner.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.items.length === 0 && <p className="muted">مشتری‌ای با این فیلتر نیست.</p>}
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button type="button" className="btn secondary" disabled={query.page <= 1} onClick={() => setQuery({ ...query, page: query.page - 1 })}>قبلی</button>
        <span className="muted">صفحه {query.page.toLocaleString('fa-IR')}</span>
        <button type="button" className="btn secondary" disabled={query.page * (data.limit || 20) >= data.total} onClick={() => setQuery({ ...query, page: query.page + 1 })}>بعدی</button>
      </div>
    </Page>
  );
}
