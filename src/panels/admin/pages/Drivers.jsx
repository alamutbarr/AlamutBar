import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAdmin } from '../auth';
import { DRIVER_STATUS_LABELS } from '../format';
import { Badge, Page, SkeletonRows } from '../components/ui';
import DriverDocuments, { flattenDriverDocuments, hasPendingDriverDocuments } from '../components/DriverDocuments';

function tone(status) {
  if (status === 'VERIFIED' || status === 'READY') return 'ok';
  if (status === 'REJECTED' || status === 'OFFLINE') return 'crit';
  if (status === 'BUSY') return 'progress';
  return 'warn';
}

export default function Drivers() {
  const navigate = useNavigate();
  const { can } = useAdmin();
  const [query, setQuery] = useState({ page: 1, q: '', verification: '', availability: '' });
  const [data, setData] = useState(null);
  const [pendingDrivers, setPendingDrivers] = useState(null);
  const [error, setError] = useState('');

  const load = () => {
    const params = new URLSearchParams({ page: String(query.page), limit: '20' });
    if (query.q) params.set('q', query.q);
    if (query.verification) params.set('verification', query.verification);
    if (query.availability) params.set('availability', query.availability);
    setError('');
    return api(`/drivers?${params}`).then(setData);
  };

  // صف تأیید مدارک مستقل از صفحه‌بندی جدول خوانده می‌شود تا همیشه دیده شود.
  const loadPending = () => api('/drivers?verification=PENDING_VERIFICATION&limit=50')
    .then((result) => setPendingDrivers(result.items || []))
    .catch((err) => setError(err.message || 'صف تأیید مدارک بارگذاری نشد.'));

  useEffect(() => {
    load().catch((err) => setError(err.message || 'فهرست رانندگان بارگذاری نشد.'));
  }, [query]);

  useEffect(() => {
    loadPending();
  }, []);

  if (error) return <Page title="رانندگان و ناوگان"><p style={{ color: 'var(--alamut-crit)' }}>{error}</p></Page>;
  if (!data) return <SkeletonRows />;

  const awaiting = (pendingDrivers || [])
    .slice()
    .sort((a, b) => Number(hasPendingDriverDocuments(b)) - Number(hasPendingDriverDocuments(a)));
  const uploadedDocs = awaiting.reduce(
    (total, driver) => total + flattenDriverDocuments(driver).filter((doc) => doc.url).length,
    0,
  );
  const canReview = can('drivers.documents');

  return (
    <Page title="رانندگان و ناوگان">
      <div className="form-grid" style={{ marginBottom: 12 }}>
        <input className="field" placeholder="نام، موبایل یا پلاک" value={query.q} onChange={(event) => setQuery({ ...query, page: 1, q: event.target.value })} />
        <select className="select" value={query.verification} onChange={(event) => setQuery({ ...query, page: 1, verification: event.target.value })}>
          <option value="">همه وضعیت‌های مدارک</option>
          <option value="PENDING_VERIFICATION">در انتظار تأیید</option>
          <option value="VERIFIED">تأیید شده</option>
          <option value="REJECTED">رد شده</option>
        </select>
        <select className="select" value={query.availability} onChange={(event) => setQuery({ ...query, page: 1, availability: event.target.value })}>
          <option value="">همه صف</option>
          <option value="READY">آماده</option>
          <option value="BUSY">مشغول</option>
          <option value="OFFLINE">آفلاین</option>
        </select>
      </div>

      <section className="card" style={{ padding: 16, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>تأیید مدارک رانندگان</h2>
          <Badge tone={awaiting.length ? 'warn' : 'ok'}>
            {awaiting.length.toLocaleString('fa-IR')} پرونده در انتظار · {uploadedDocs.toLocaleString('fa-IR')} تصویر
          </Badge>
        </div>
        <p className="muted">مدارک بارگذاری‌شده را مثل احراز هویت صاحب کالا همین‌جا تأیید یا رد کنید.</p>
        {pendingDrivers === null && <p className="muted">در حال دریافت صف تأیید مدارک...</p>}
        {pendingDrivers !== null && awaiting.length === 0 && <p className="muted">همهٔ مدارک بررسی شده‌اند؛ پرونده‌ای در انتظار تأیید نیست.</p>}
        <div style={{ display: 'grid', gap: 10 }}>
          {awaiting.map((driver) => {
            const docs = flattenDriverDocuments(driver);
            const pendingDocs = docs.filter((doc) => doc.url && doc.status === 'PENDING').length;
            return (
              <article key={driver.id} className="card" style={{ padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <strong>{driver.fullName}</strong>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Badge tone={pendingDocs ? 'warn' : 'idle'}>{pendingDocs.toLocaleString('fa-IR')} تصویر در انتظار</Badge>
                    <button type="button" className="btn secondary" onClick={() => navigate(`/admin/drivers/${driver.id}`)}>پرونده راننده</button>
                  </div>
                </div>
                <p className="muted">{driver.phone} — پلاک {driver.plate || '—'} — {[driver.tractorType, driver.trailerType].filter(Boolean).join(' / ') || 'بدون ناوگان'}</p>
                <Badge tone={tone(driver.verificationStatus)}>{DRIVER_STATUS_LABELS[driver.verificationStatus] || driver.verificationStatus}</Badge>
                <DriverDocuments
                  driver={driver}
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
              <th>راننده</th>
              <th>موبایل</th>
              <th>پلاک</th>
              <th>ناوگان</th>
              <th>مدارک</th>
              <th>صف</th>
              <th>GPS</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((driver) => (
              <tr key={driver.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/admin/drivers/${driver.id}`)}>
                <td>{driver.fullName}</td>
                <td>{driver.phone}</td>
                <td>{driver.plate || '—'}</td>
                <td>{[driver.tractorType, driver.trailerType].filter(Boolean).join(' / ') || '—'}</td>
                <td><Badge tone={tone(driver.verificationStatus)}>{DRIVER_STATUS_LABELS[driver.verificationStatus] || driver.verificationStatus}</Badge></td>
                <td><Badge tone={tone(driver.availability)}>{DRIVER_STATUS_LABELS[driver.availability] || driver.availability}</Badge></td>
                <td>{driver.isGpsActive ? 'فعال' : 'قطع'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.items.length === 0 && <p className="muted">راننده‌ای با این فیلتر نیست.</p>}
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button type="button" className="btn secondary" disabled={query.page <= 1} onClick={() => setQuery({ ...query, page: query.page - 1 })}>قبلی</button>
        <span className="muted">صفحه {query.page.toLocaleString('fa-IR')}</span>
        <button type="button" className="btn secondary" disabled={query.page * (data.limit || 20) >= data.total} onClick={() => setQuery({ ...query, page: query.page + 1 })}>بعدی</button>
      </div>
    </Page>
  );
}
