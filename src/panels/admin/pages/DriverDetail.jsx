import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '../api';
import { useAdmin } from '../auth';
import { DRIVER_STATUS_LABELS, WORKFLOW_LABELS, when } from '../format';
import { Badge, Page, SkeletonRows } from '../components/ui';
import DriverDocuments from '../components/DriverDocuments';

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
          <article className="card" style={{ padding: 16 }}>
            <h2 style={{ marginTop: 0 }}>تأیید مدارک راننده</h2>
            <p className="muted">همان روند احراز هویت صاحب کالا: هر عکس جدا تأیید یا با دلیل رد می‌شود.</p>
            <DriverDocuments driver={driver} canReview={can('drivers.documents')} onReviewed={load} />
          </article>
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
