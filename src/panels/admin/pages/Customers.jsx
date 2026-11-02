import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAdmin } from '../auth';
import { when } from '../format';
import { Badge, Page, SkeletonRows } from '../components/ui';
import OwnerDocuments, { hasPendingOwnerDocuments, ownerDocuments } from '../components/OwnerDocuments';

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

function documentSummary(owner) {
  const docs = ownerDocuments(owner);
  const pending = docs.filter((doc) => doc.url && doc.status === 'PENDING').length;
  const uploaded = docs.filter((doc) => doc.url).length;
  return { total: docs.length, uploaded, pending };
}

export default function Customers() {
  const navigate = useNavigate();
  const { can } = useAdmin();
  const [query, setQuery] = useState({ page: 1, q: '', verification: '' });
  const [data, setData] = useState(null);
  const [pendingOwners, setPendingOwners] = useState(null);
  const [error, setError] = useState('');

  const load = () => {
    const params = new URLSearchParams({ page: String(query.page), limit: '20' });
    if (query.q) params.set('q', query.q);
    if (query.verification) params.set('verification', query.verification);
    setError('');
    return api(`/customers?${params}`).then(setData);
  };

  // صف تأیید مدارک مستقل از صفحه‌بندی جدول خوانده می‌شود.
  const loadPending = () => api('/customers?verification=PENDING&limit=50')
    .then((result) => setPendingOwners(result.items || []))
    .catch((err) => setError(err.message || 'صف تأیید مدارک مشتریان بارگذاری نشد.'));

  useEffect(() => {
    load().catch((err) => setError(err.message || 'فهرست مشتریان بارگذاری نشد.'));
  }, [query]);

  useEffect(() => {
    loadPending();
  }, []);

  if (error) return <Page title="مشتریان"><p style={{ color: 'var(--alamut-crit)' }}>{error}</p></Page>;
  if (!data) return <SkeletonRows />;

  const awaiting = (pendingOwners || [])
    .slice()
    .sort((a, b) => Number(hasPendingOwnerDocuments(b)) - Number(hasPendingOwnerDocuments(a)));
  const uploadedDocs = awaiting.reduce((total, owner) => total + documentSummary(owner).uploaded, 0);
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

      <section className="card" style={{ padding: 16, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>تأیید مدارک مشتریان</h2>
          <Badge tone={awaiting.length ? 'warn' : 'ok'}>
            {awaiting.length.toLocaleString('fa-IR')} پرونده در انتظار · {uploadedDocs.toLocaleString('fa-IR')} تصویر
          </Badge>
        </div>
        <p className="muted">مدارک هویتی بارگذاری‌شده را همان‌جا که رانندگان را تأیید می‌کنید، مدرک‌به‌مدرک بررسی کنید.</p>
        {pendingOwners === null && <p className="muted">در حال دریافت صف تأیید مدارک...</p>}
        {pendingOwners !== null && awaiting.length === 0 && <p className="muted">همهٔ مدارک بررسی شده‌اند؛ پرونده‌ای در انتظار تأیید نیست.</p>}
        <div style={{ display: 'grid', gap: 10 }}>
          {awaiting.map((owner) => {
            const summary = documentSummary(owner);
            return (
              <article key={owner.id} className="card" style={{ padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <strong>{owner.companyName || owner.fullName}</strong>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Badge tone={summary.pending ? 'warn' : 'idle'}>{summary.pending.toLocaleString('fa-IR')} تصویر در انتظار</Badge>
                    <button type="button" className="btn secondary" onClick={() => navigate(`/admin/customers/${owner.id}`)}>پرونده مشتری</button>
                  </div>
                </div>
                <p className="muted">{owner.fullName} — {owner.phone || 'بدون موبایل'} — کد ملی {owner.nationalId || '—'}</p>
                <Badge tone={tone(owner.verificationStatus)}>
                  {VERIFICATION_LABELS[owner.verificationStatus] || 'در انتظار تکمیل مدارک'}
                </Badge>
                <OwnerDocuments
                  owner={owner}
                  canReview={canReview}
                  onReviewed={() => {
                    loadPending().catch((err) => setError(err.message));
                    load().catch((err) => setError(err.message));
                  }}
                />
              </article>
            );
          })}
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
              <th>متصدی اجباری</th>
              <th>ثبت</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((owner) => {
              const summary = documentSummary(owner);
              return (
                <tr key={owner.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/admin/customers/${owner.id}`)}>
                  <td>{owner.fullName || '—'}</td>
                  <td>{owner.companyName || '—'}</td>
                  <td>{owner.phone || '—'}</td>
                  <td>{owner.nationalId || '—'}</td>
                  <td>
                    <Badge tone={tone(owner.verificationStatus)}>{VERIFICATION_LABELS[owner.verificationStatus] || 'در انتظار'}</Badge>
                    {summary.pending > 0 && <span className="muted"> · {summary.pending.toLocaleString('fa-IR')} در انتظار</span>}
                  </td>
                  <td>{owner.requireInspector ? 'بله' : 'خیر'}</td>
                  <td>{owner.createdAt ? when(owner.createdAt) : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {data.items.length === 0 && <p className="muted">مشتری‌ای با این فیلتر نیست.</p>}
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button type="button" className="btn secondary" disabled={query.page <= 1} onClick={() => setQuery({ ...query, page: query.page - 1 })}>قبلی</button>
        <span className="muted">صفحه {query.page.toLocaleString('fa-IR')} · {(data.total || 0).toLocaleString('fa-IR')} پرونده</span>
        <button type="button" className="btn secondary" disabled={query.page * (data.limit || 20) >= data.total} onClick={() => setQuery({ ...query, page: query.page + 1 })}>بعدی</button>
      </div>
    </Page>
  );
}
