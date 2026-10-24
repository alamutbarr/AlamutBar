import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, upload } from '../api';

const PHOTOS = [
  ['seal', 'عکس پلمب'],
  ['lashing', 'عکس مهار'],
  ['weighbridge_empty', 'برگه باسکول خالی'],
  ['weighbridge_full', 'برگه باسکول پر'],
  ['cargo', 'عکس محموله'],
];

function money(value) {
  if (value == null) return '—';
  return `${Number(value).toLocaleString('fa-IR')} تومان`;
}

export default function Visit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [mission, setMission] = useState(null);
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  function apply(next) {
    setMission(next);
    const vehicleGap = (next.discrepancies || []).find((item) => item.field === 'vehicle');
    setForm({
      checklist: next.checklist,
      weightEmpty: next.weights.empty ?? '',
      weightFull: next.weights.full ?? '',
      cargoValue: next.recordedCargoValue ?? next.cargo.declaredValue ?? '',
      actualCargoType: next.actualCargoType || next.cargo.type || '',
      actualVehicle: vehicleGap?.actual || '',
      note: '',
    });
  }

  useEffect(() => {
    api(`/missions/${id}`).then(apply).catch((err) => setError(err.message));
  }, [id]);

  if (error && !mission) return <p style={{ color: 'var(--alamut-crit)' }}>{error}</p>;
  if (!mission || !form) return <p className="inspector-muted">در حال آوردن پرونده...</p>;

  const mapHref = mission.visit.lat != null
    ? `https://www.openstreetmap.org/?mlat=${mission.visit.lat}&mlon=${mission.visit.lng}#map=16/${mission.visit.lat}/${mission.visit.lng}`
    : null;

  async function save(finalize) {
    setError('');
    setMessage('');
    try {
      const next = await api(`/missions/${id}/report`, {
        method: 'POST',
        body: {
          checklist: form.checklist,
          weightEmpty: form.weightEmpty,
          weightFull: form.weightFull,
          cargoValue: form.cargoValue,
          actualCargoType: form.actualCargoType,
          actualVehicle: form.actualVehicle,
          discrepancies: form.note ? [{ field: 'note', expected: '', actual: '', note: form.note }] : [],
          finalize,
        },
      });
      apply(next);
      setMessage(finalize ? 'گزارش به مرکز عملیات رسید.' : 'پیش‌نویس ذخیره شد.');
    } catch (err) {
      setError(err.message);
    }
  }

  async function addPhoto(kind, file) {
    if (!file) return;
    setError('');
    try {
      apply(await upload(`/missions/${id}/photos`, file, { kind }));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <button type="button" className="inspector-btn secondary" onClick={() => navigate('/inspector')}>بازگشت</button>
      <article className="inspector-card">
        <div className="inspector-row">
          <h1 style={{ fontSize: 22 }}>{mission.trackingCode}</h1>
          <span className={`inspector-pill ${mission.completeness.complete ? 'ok' : 'warn'}`}>
            {mission.completeness.complete ? 'آماده ادامه' : 'ناقص'}
          </span>
        </div>
        <p>{mission.workflowLabel}</p>
        <p><strong>محل مراجعه:</strong> {mission.visit.city}، {mission.visit.address}</p>
        <p><strong>زمان:</strong> {mission.visit.date ? new Date(mission.visit.date).toLocaleDateString('fa-IR') : '—'} از {mission.visit.from || '—'} تا {mission.visit.to || '—'}</p>
        <p className="inspector-muted">مقصد: {mission.destinationCity}</p>
        <p className="inspector-muted">{mission.payerNote}</p>
        {mapHref && <a href={mapHref} target="_blank" rel="noreferrer">مسیر روی نقشه</a>}
      </article>

      <article className="inspector-card">
        <h2>چه چیزی را باید ببینید</h2>
        <p>بار: {mission.cargo.type}، {mission.cargo.weightKg?.toLocaleString('fa-IR')} کیلو، بسته‌بندی {mission.cargo.packaging || '—'}</p>
        <p>ارزش اعلامی: {money(mission.cargo.declaredValue)}</p>
        <p>ناوگان: {mission.vehicle.title || '—'} {mission.vehicle.plate ? `— ${mission.vehicle.plate}` : ''}</p>
        <p>راننده: {mission.vehicle.driverName || 'هنوز تخصیص نشده'}</p>
        {!mission.assignedToMe && mission.canEdit && (
          <button type="button" className="inspector-btn" onClick={async () => {
            try { apply(await api(`/missions/${id}/claim`, { method: 'POST' })); }
            catch (err) { setError(err.message); }
          }}>این مراجعه را می‌پذیرم</button>
        )}
      </article>

      <article className="inspector-card">
        <h2>چک‌لیست</h2>
        {form.checklist.map((item, index) => (
          <label key={item.key} className="inspector-check">
            <input type="checkbox" checked={item.checked} disabled={!mission.canEdit} onChange={(event) => {
              const checklist = form.checklist.slice();
              checklist[index] = { ...item, checked: event.target.checked };
              setForm({ ...form, checklist });
            }} />
            <span>{item.label}</span>
          </label>
        ))}
      </article>

      <article className="inspector-card">
        <h2>عکس و مدرک</h2>
        {PHOTOS.map(([kind, label]) => {
          const shots = mission.photos.filter((photo) => photo.kind === kind);
          return (
            <div key={kind} className="inspector-photo">
              <div>
                <strong>{label}</strong>
                <div className="inspector-muted">{shots.length ? `${shots.length.toLocaleString('fa-IR')} عکس` : 'ثبت نشده'}</div>
              </div>
              {shots[0] && <img src={shots[0].url} alt={label} />}
              {mission.canEdit && (
                <label className="inspector-btn secondary" style={{ width: 'auto' }}>
                  دوربین
                  <input type="file" accept="image/*" capture="environment" hidden onChange={(event) => addPhoto(kind, event.target.files?.[0])} />
                </label>
              )}
            </div>
          );
        })}
      </article>

      <article className="inspector-card">
        <h2>باسکول و ارزش بیمه</h2>
        <label className="inspector-muted">وزن خالی (کیلو)</label>
        <input className="inspector-field" inputMode="decimal" disabled={!mission.canEdit} value={form.weightEmpty} onChange={(event) => setForm({ ...form, weightEmpty: event.target.value })} />
        <label className="inspector-muted">وزن پر (کیلو)</label>
        <input className="inspector-field" inputMode="decimal" disabled={!mission.canEdit} value={form.weightFull} onChange={(event) => setForm({ ...form, weightFull: event.target.value })} />
        <p className="inspector-muted">خالص ثبت‌شده: {mission.weights.net ?? '—'}</p>
        <label className="inspector-muted">ارزش دقیق کالا (تومان)</label>
        <input className="inspector-field" inputMode="numeric" disabled={!mission.canEdit} value={form.cargoValue} onChange={(event) => setForm({ ...form, cargoValue: event.target.value })} />
        <label className="inspector-muted">نوع بار در محل</label>
        <input className="inspector-field" disabled={!mission.canEdit} value={form.actualCargoType} onChange={(event) => setForm({ ...form, actualCargoType: event.target.value })} />
        <label className="inspector-muted">اگر خودرو فرق دارد، نوع واقعی</label>
        <input className="inspector-field" disabled={!mission.canEdit} value={form.actualVehicle} onChange={(event) => setForm({ ...form, actualVehicle: event.target.value })} />
        <textarea className="inspector-area" disabled={!mission.canEdit} placeholder="یادداشت مغایرت" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} />
      </article>

      <article className="inspector-card">
        <h2>وضعیت بازرسی</h2>
        <p>تصمیم مرکز عملیات: {mission.decision === 'APPROVED' ? 'تأیید' : mission.decision === 'CORRECTED' ? 'اصلاح شد' : mission.decision === 'STOPPED' ? 'توقف' : mission.decision === 'PENDING' ? 'در انتظار تأیید سرپرست' : 'هنوز ثبت نشده'}</p>
        {mission.discrepancies.length > 0 && (
          <ul>
            {mission.discrepancies.map((item) => <li key={`${item.field}-${item.note}`}>{item.note || item.field}</li>)}
          </ul>
        )}
        {mission.completeness.missing.length > 0 && (
          <p className="inspector-pill warn">برای ادامه لازم است: {mission.completeness.missing.map((item) => item.label).join('، ')}</p>
        )}
        {mission.completeness.complete && mission.discrepancies.length === 0 && <p className="inspector-pill ok">مدارک کامل است و مغایرتی ثبت نشده.</p>}
        {error && <p style={{ color: 'var(--alamut-crit)' }}>{error}</p>}
        {message && <p>{message}</p>}
        {mission.canEdit && (
          <div style={{ display: 'grid', gap: 8 }}>
            <button type="button" className="inspector-btn secondary" onClick={() => save(false)}>ذخیره پیش‌نویس</button>
            <button type="button" className="inspector-btn gold" onClick={() => save(true)}>ارسال به مرکز عملیات</button>
          </div>
        )}
      </article>
    </>
  );
}
