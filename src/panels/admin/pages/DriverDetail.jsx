import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet';
import { toast } from 'sonner';
import { api } from '../api';
import { useAdmin } from '../auth';
import { DRIVER_STATUS_LABELS, WORKFLOW_LABELS, money, when } from '../format';
import { Badge, Page, SkeletonRows } from '../components/ui';
import { VERIFICATION_SECTIONS } from '../../driver/verification';
import { describeVehicle } from '../../driver/vehicleConfig';

const STATUS = {
  MISSING: 'ارسال نشده',
  PENDING: 'در انتظار بررسی',
  APPROVED: 'تأیید شد',
  REJECTED: 'رد شد',
};

function docsByKey(driver) {
  const map = new Map();
  (driver.documentList || []).forEach((doc) => map.set(doc.key, doc));
  ['personal', 'vehicle', 'insurance'].forEach((group) => {
    (driver.documents?.[group] || []).forEach((doc) => {
      if (!map.has(doc.key)) map.set(doc.key, { ...doc, group });
    });
  });
  return map;
}

function dim(value, label) {
  if (value == null || value === '') return null;
  return `${label} ${Number(value).toLocaleString('fa-IR')} سانتی‌متر`;
}

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

  const vehicle = describeVehicle(driver.tractorType, driver.trailerType, driver.vehicleSpecs);
  const fields = driver.vehicleFields?.length ? driver.vehicleFields : vehicle.fields;
  const byKey = docsByKey(driver);
  const activeCargo = (driver.missions || []).find((mission) => mission.isActive);

  async function review(doc, decision, note = '') {
    try {
      await api(`/drivers/${id}/documents/review`, {
        method: 'POST',
        body: { key: doc.key, group: doc.group, decision, reason: note },
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
            {driver.rejectionReason && <p>دلیل رد: {driver.rejectionReason}</p>}
            {can('drivers.queue') && driver.verificationStatus === 'VERIFIED' && driver.availability !== 'BUSY' && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn" onClick={() => setAvailability('READY')}>ورود به صف آماده</button>
                <button type="button" className="btn secondary" onClick={() => setAvailability('OFFLINE')}>خارج از صف</button>
              </div>
            )}
          </article>

          <article className="card" style={{ padding: 16 }}>
            <h3 style={{ marginTop: 0 }}>مشخصات ماشین</h3>
            <p>پلاک: {driver.plate || '—'}</p>
            <p>نوع کشنده: {driver.tractorLabel || vehicle.tractor || '—'}</p>
            <p>نوع گاری: {driver.trailerLabel || vehicle.trailer || '—'}</p>
            {fields.map((field) => (
              <p key={field.key}>{field.title}: {field.value || '—'}</p>
            ))}
          </article>

          {activeCargo && (
            <article className="card" style={{ padding: 16 }}>
              <h3 style={{ marginTop: 0 }}>بار قبول‌شده</h3>
              <p>{activeCargo.trackingCode} — {activeCargo.workflowLabel || WORKFLOW_LABELS[activeCargo.workflowStatus]}</p>
              <p>{activeCargo.origin || '—'} ← {activeCargo.destination || '—'}</p>
              <p>نوع بار: {activeCargo.cargo?.type || '—'}</p>
              <p>وزن: {activeCargo.cargo?.weightKg != null ? `${Number(activeCargo.cargo.weightKg).toLocaleString('fa-IR')} کیلوگرم` : '—'}</p>
              <p>
                {[
                  dim(activeCargo.cargo?.lengthCm, 'طول'),
                  dim(activeCargo.cargo?.widthCm, 'عرض'),
                  dim(activeCargo.cargo?.heightCm, 'ارتفاع'),
                ].filter(Boolean).join('، ') || 'ابعاد ثبت نشده'}
              </p>
              {activeCargo.cargo?.value != null && <p>ارزش: {money(activeCargo.cargo.value)}</p>}
              <button type="button" className="btn secondary" onClick={() => navigate(`/admin/orders/${activeCargo.id}`)}>مشاهده سفارش</button>
            </article>
          )}

          <article className="card" style={{ padding: 16 }}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
              <div>
                <h3 style={{ margin: 0 }}>احراز هویت راننده</h3>
                <p className="muted" style={{ margin: '6px 0 0' }}>همان مدارکی که راننده در پنل خود بارگذاری و ارسال کرده است.</p>
              </div>
              <Badge tone={driver.verificationStatus === 'VERIFIED' ? 'ok' : driver.verificationStatus === 'REJECTED' ? 'crit' : 'warn'}>
                {DRIVER_STATUS_LABELS[driver.verificationStatus]}
              </Badge>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {VERIFICATION_SECTIONS.flatMap((section) => section.slots.map((slot) => {
                const key = `${section.id}:${slot.id}`;
                const doc = byKey.get(key);
                const open = rejecting === key;
                return (
                  <article key={key} style={{ border: '1px solid var(--line)', borderRadius: 8, padding: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                      <div>
                        <strong>{slot.label}</strong>
                        <div className="muted">{section.title}{section.mandatory ? ' — اجباری' : ' — اختیاری'}</div>
                      </div>
                      <Badge tone={doc?.status === 'APPROVED' ? 'ok' : doc?.status === 'REJECTED' ? 'crit' : 'warn'}>
                        {STATUS[doc?.status || 'MISSING']}
                      </Badge>
                    </div>
                    {doc?.url ? (
                      <a href={doc.url} target="_blank" rel="noreferrer">
                        <img src={doc.url} alt={slot.label} style={{ display: 'block', marginTop: 8, maxWidth: 240, maxHeight: 160, objectFit: 'contain', background: '#f7f6f0' }} />
                      </a>
                    ) : <p className="muted">ارسال نشده</p>}
                    {doc?.note && <p>دلیل رد: {doc.note}</p>}
                    {can('drivers.documents') && doc?.url && doc.status === 'PENDING' && (
                      <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                        <button type="button" className="btn" onClick={() => review(doc, 'APPROVED')}>تأیید این مدرک</button>
                        <button type="button" className="btn secondary" onClick={() => { setRejecting(open ? null : key); setReason(''); }}>رد</button>
                      </div>
                    )}
                    {open && (
                      <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                        <textarea className="area" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="دلیل رد مدرک (حداقل سه نویسه)" />
                        <button type="button" className="btn" onClick={() => review(doc, 'REJECTED', reason)}>ارسال دلیل رد</button>
                      </div>
                    )}
                  </article>
                );
              }))}
              {[...byKey.values()].filter((doc) => {
                const canonical = VERIFICATION_SECTIONS.some((section) => section.slots.some((slot) => `${section.id}:${slot.id}` === doc.key));
                const legacy = ['license', 'national_card', 'vehicle_card', 'smart_card'].includes(doc.key);
                return !canonical && !legacy;
              }).map((doc) => (
                <article key={doc.key} style={{ border: '1px solid var(--line)', borderRadius: 8, padding: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <strong>{doc.title || doc.key}</strong>
                    <Badge tone={doc.status === 'APPROVED' ? 'ok' : doc.status === 'REJECTED' ? 'crit' : 'warn'}>{STATUS[doc.status || 'MISSING']}</Badge>
                  </div>
                  {doc.url ? (
                    <a href={doc.url} target="_blank" rel="noreferrer">
                      <img src={doc.url} alt={doc.title} style={{ display: 'block', marginTop: 8, maxWidth: 240, maxHeight: 160, objectFit: 'contain', background: '#f7f6f0' }} />
                    </a>
                  ) : <p className="muted">ارسال نشده</p>}
                </article>
              ))}
            </div>
          </article>
        </div>

        <div style={{ display: 'grid', gap: 12, alignContent: 'start' }}>
          <article className="card" style={{ padding: 16 }}>
            <h3 style={{ marginTop: 0 }}>موقعیت GPS</h3>
            <p>آخرین اتصال: {when(driver.lastLocationAt)} {driver.isGpsActive ? '(فعال)' : '(قطع)'}</p>
            {driver.lastLocation ? (
              <div className="map-shell driver-gps">
                <MapContainer center={[driver.lastLocation.lat, driver.lastLocation.lng]} zoom={12}>
                  <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <CircleMarker center={[driver.lastLocation.lat, driver.lastLocation.lng]} radius={10} pathOptions={{ color: '#087f8c', fillColor: '#d7b56d', fillOpacity: 0.9 }}>
                    <Popup>{driver.fullName}</Popup>
                  </CircleMarker>
                </MapContainer>
              </div>
            ) : (
              <p className="muted">هنوز موقعیت GPS برای این راننده ثبت نشده است. بعد از اتصال دستگاه، اینجا نمایش داده می‌شود.</p>
            )}
          </article>
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
                {mission.trackingCode} — {mission.workflowLabel || WORKFLOW_LABELS[mission.workflowStatus] || mission.workflowStatus}
                {mission.origin ? ` — ${mission.origin} ← ${mission.destination || '—'}` : ''}
              </button>
            ))}
            {!(driver.missions || []).length && <p className="muted">مأموریتی ثبت نشده.</p>}
          </article>
        </div>
      </div>
    </Page>
  );
}
