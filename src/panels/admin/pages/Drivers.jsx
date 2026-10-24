import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { DRIVER_STATUS_LABELS } from '../format';
import { Badge, Page, SkeletonRows } from '../components/ui';

function tone(status) {
  if (status === 'VERIFIED' || status === 'READY') return 'ok';
  if (status === 'REJECTED' || status === 'OFFLINE') return 'crit';
  if (status === 'BUSY') return 'progress';
  return 'warn';
}

export default function Drivers() {
  const navigate = useNavigate();
  const [query, setQuery] = useState({ page: 1, q: '', verification: '', availability: '' });
  const [data, setData] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams({ page: String(query.page), limit: '20' });
    if (query.q) params.set('q', query.q);
    if (query.verification) params.set('verification', query.verification);
    if (query.availability) params.set('availability', query.availability);
    api(`/drivers?${params}`).then(setData).catch(() => setData({ items: [], total: 0, limit: 20 }));
  }, [query]);

  if (!data) return <SkeletonRows />;

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
