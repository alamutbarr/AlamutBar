import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '../api';
import { useAdmin } from '../auth';
import { DRIVER_STATUS_LABELS, WORKFLOW_LABELS, when } from '../format';
import { Badge, Page, SkeletonRows } from '../components/ui';

const GROUPS = [
  ['personal', 'مدارک فردی'],
  ['vehicle', 'مدارک ناوگان'],
  ['insurance', 'بیمه'],
];

export default function DriverDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { can } = useAdmin();
  const [driver, setDriver] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState('');

  const load = () => api(`/drivers/${id}`).then(setDriver);

  useEffect(() => {
    load().catch((error) => toast.error(error.message));
  }, [id]);

  if (!driver) return <SkeletonRows />;

  async function review(group, index, decision, note = '') {
    try {
      await api(`/drivers/${id}/documents/review`, {
        method: 'POST',
        body: { group, index, decision, reason: note },
      });
      toast.success(decision === 'APPROVED' ? 'مدرک تأیید شد' : 'دلیل رد برای راننده ارسال شد');
      setRejecting(null);
      setReason('');
      load();
    } catch (error) {
      toast.error(error.message);
    }
  }

  async function setAvailability(availability) {
    try {
      await api(`/drivers/${id}/availability`, { method: 'PATCH', body: { availability } });
      toast.success('صف به‌روز شد');
      load();
    } catch (error) {
      toast.error(error.message);
    }
  }

  return (
    <Page title={driver.fullName} action={<button type="button" className="btn secondary" onClick={() => navigate('/admin/drivers')}>بازگشت</button>}>
      <div className="split">
        <div style={{ display: 'grid', gap: 12 }}>
          <article className="card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Badge tone={driver.verificationStatus === 'VERIFIED' ? 'ok' : driver.verificationStatus === 'REJECTED' ? 'crit' : 'warn'}>
                {DRIVER_STATUS_LABELS[driver.verificationStatus]}
              </Badge>
              <Badge tone={driver.availability === 'READY' ? 'ok' : driver.availability === 'BUSY' ? 'progress' : 'idle'}>
                {DRIVER_STATUS_LABELS[driver.availability]}
              </Badge>
            </div>
            <p>موبایل: {driver.phone}</p>
            <p>کد ملی: {driver.nationalId || '—'}</p>
            <p>گواهینامه: {driver.licenseNumber || '—'}</p>
            <p>کارت هوشمند: {driver.smartCardNumber || '—'}</p>
            <p>پلاک: {driver.plate || '—'}</p>
            <p>ناوگان: {[driver.tractorType, driver.trailerType].filter(Boolean).join(' / ') || '—'}</p>
            <p>آخرین GPS: {when(driver.lastLocationAt)} {driver.isGpsActive ? '(فعال)' : '(قطع)'}</p>
            {driver.rejectionReason && <p>دلیل رد: {driver.rejectionReason}</p>}
            {can('drivers.queue') && driver.verificationStatus === 'VERIFIED' && driver.availability !== 'BUSY' && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn" onClick={() => setAvailability('READY')}>ورود به صف آماده</button>
                <button type="button" className="btn secondary" onClick={() => setAvailability('OFFLINE')}>خارج از صف</button>
              </div>
            )}
          </article>
          {GROUPS.map(([key, title]) => (
            <article key={key} className="card" style={{ padding: 16 }}>
              <h3 style={{ marginTop: 0 }}>{title}</h3>
              {(driver.documents?.[key] || []).map((doc, index) => {
                const open = rejecting === `${key}:${index}`;
                return (
                  <div key={`${doc.key}-${index}`} style={{ display: 'grid', gap: 8, padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                      <div>
                        <strong>{doc.title}</strong>
                        <div className="muted">{doc.status === 'APPROVED' ? 'تأیید' : doc.status === 'REJECTED' ? `رد شد: ${doc.note || ''}` : 'در انتظار بررسی'}</div>
                      </div>
                      {can('drivers.documents') && doc.status === 'PENDING' && (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button type="button" className="btn" onClick={() => review(key, index, 'APPROVED')}>تأیید</button>
                          <button type="button" className="btn secondary" onClick={() => { setRejecting(open ? null : `${key}:${index}`); setReason(''); }}>رد</button>
                        </div>
                      )}
                    </div>
                    {doc.url && (
                      <div>
                        <a href={doc.url} target="_blank" rel="noreferrer">
                          <img src={doc.url} alt={doc.title} style={{ maxWidth: 220, maxHeight: 140, objectFit: 'contain', borderRadius: 8, background: '#f7f6f0' }} />
                        </a>
                        <div><a href={doc.url} download>دانلود</a></div>
                      </div>
                    )}
                    {open && (
                      <div style={{ display: 'grid', gap: 8 }}>
                        <textarea className="area" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="دلیل رد مدرک (حداقل سه نویسه)" />
                        <button type="button" className="btn" onClick={() => review(key, index, 'REJECTED', reason)}>ارسال دلیل رد</button>
                      </div>
                    )}
                  </div>
                );
              })}
              {!(driver.documents?.[key] || []).length && <p className="muted">مدرکی بارگذاری نشده.</p>}
            </article>
          ))}
        </div>
        <div style={{ display: 'grid', gap: 12, alignContent: 'start' }}>
          <article className="card" style={{ padding: 16 }}>
            <h3 style={{ marginTop: 0 }}>عملکرد</h3>
            <p>مأموریت موفق: {(driver.performance?.successfulMissions || 0).toLocaleString('fa-IR')}</p>
            <p>تأخیر: {(driver.performance?.delays || 0).toLocaleString('fa-IR')}</p>
            <p>انحراف مسیر: {(driver.performance?.routeDeviations || 0).toLocaleString('fa-IR')}</p>
            <p>قطع GPS: {(driver.performance?.gpsCuts || 0).toLocaleString('fa-IR')}</p>
          </article>
          <article className="card" style={{ padding: 16 }}>
            <h3 style={{ marginTop: 0 }}>مأموریت‌های اخیر</h3>
            {(driver.missions || []).map((mission) => (
              <button key={mission.id} type="button" className="nav-link" onClick={() => navigate(`/admin/orders/${mission.id}`)}>
                {mission.trackingCode} — {WORKFLOW_LABELS[mission.workflowStatus] || mission.workflowStatus}
              </button>
            ))}
            {!(driver.missions || []).length && <p className="muted">مأموریتی ثبت نشده.</p>}
          </article>
        </div>
      </div>
    </Page>
  );
}
