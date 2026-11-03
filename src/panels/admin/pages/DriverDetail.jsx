import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '../api';
import { useAdmin } from '../auth';
import { DRIVER_STATUS_LABELS, WORKFLOW_LABELS, when } from '../format';
import { Badge, Page, SkeletonRows } from '../components/ui';
import DriverDocuments, { flattenDriverDocuments, hasPendingDriverDocuments } from '../components/DriverDocuments';

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #eef2f0' }}>
      <span className="muted">{label}</span>
      <strong style={{ fontWeight: 500 }}>{children || '—'}</strong>
    </div>
  );
}

export default function DriverDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { can } = useAdmin();
  const [driver, setDriver] = useState(null);

  const load = () => api(`/drivers/${id}`).then(setDriver);

  useEffect(() => {
    load().catch((error) => toast.error(error.message));
  }, [id]);

  if (!driver) return <SkeletonRows />;

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
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              <Badge tone={driver.verificationStatus === 'VERIFIED' ? 'ok' : driver.verificationStatus === 'REJECTED' ? 'crit' : 'warn'}>
                {DRIVER_STATUS_LABELS[driver.verificationStatus] || driver.verificationStatus}
              </Badge>
              {hasPendingDriverDocuments(driver) && <Badge tone="warn">مدرک در انتظار بررسی</Badge>}
              <Badge tone={driver.availability === 'READY' ? 'ok' : driver.availability === 'BUSY' ? 'progress' : 'idle'}>
                {DRIVER_STATUS_LABELS[driver.availability] || driver.availability}
              </Badge>
            </div>
            <h2 style={{ margin: '0 0 8px' }}>اطلاعات راننده</h2>
            <Field label="نام">{driver.fullName}</Field>
            <Field label="موبایل">{driver.phone}</Field>
            <Field label="کد ملی">{driver.nationalId}</Field>
            <Field label="گواهینامه">{driver.licenseNumber}</Field>
            <Field label="کارت هوشمند">{driver.smartCardNumber}</Field>
            <Field label="پلاک">{driver.plate}</Field>
            <Field label="ناوگان">{[driver.tractorType, driver.trailerType].filter(Boolean).join(' / ')}</Field>
            <Field label="مدارک ارسال‌شده">{flattenDriverDocuments(driver).filter((doc) => doc.url).length.toLocaleString('fa-IR')}</Field>
            <Field label="وضعیت مدارک">{DRIVER_STATUS_LABELS[driver.verificationStatus] || driver.verificationStatus}</Field>
            <Field label="آخرین GPS">{driver.lastLocationAt ? `${when(driver.lastLocationAt)} ${driver.isGpsActive ? '(فعال)' : '(قطع)'}` : null}</Field>
            <Field label="ثبت پرونده">{when(driver.createdAt)}</Field>
            {driver.rejectionReason && <p>یادداشت بررسی: {driver.rejectionReason}</p>}
            {can('drivers.queue') && driver.verificationStatus === 'VERIFIED' && driver.availability !== 'BUSY' && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn" onClick={() => setAvailability('READY')}>ورود به صف آماده</button>
                <button type="button" className="btn secondary" onClick={() => setAvailability('OFFLINE')}>خارج از صف</button>
              </div>
            )}
          </article>
          <article className="card" style={{ padding: 16 }}>
            <h2 style={{ marginTop: 0 }}>مدارک ارسال‌شده برای تأیید</h2>
            <p className="muted">هر تصویر را جدا ببینید و همان‌جا تأیید یا با دلیل رد کنید.</p>
            <DriverDocuments driver={driver} canReview={can('drivers.documents')} onReviewed={load} />
          </article>
        </div>
        <div style={{ display: 'grid', gap: 12, alignContent: 'start' }}>
          <article className="card" style={{ padding: 16 }}>
            <h3 style={{ marginTop: 0 }}>عملکرد</h3>
            <Field label="مأموریت موفق">{(driver.performance?.successfulMissions || 0).toLocaleString('fa-IR')}</Field>
            <Field label="تأخیر">{(driver.performance?.delays || 0).toLocaleString('fa-IR')}</Field>
            <Field label="انحراف مسیر">{(driver.performance?.routeDeviations || 0).toLocaleString('fa-IR')}</Field>
            <Field label="قطع GPS">{(driver.performance?.gpsCuts || 0).toLocaleString('fa-IR')}</Field>
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
