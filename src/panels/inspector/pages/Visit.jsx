import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, upload } from '../api';
import SearchableSelect from '../../owner/components/common/SearchableSelect';
import Input from '../../owner/components/common/Input';
import CARGO_TYPES from '../../../shared/cargoTypes.json';
import { formatGroupedDigits, ungroupNumber } from '../../owner/utils/digits';

const PHOTOS = [
  ['seal', 'عکس پلمب'],
  ['lashing', 'عکس مهار'],
  ['weighbridge_empty', 'برگه باسکول خالی'],
  ['weighbridge_full', 'برگه باسکول پر'],
  ['cargo', 'عکس محموله'],
];

const PHOTO_MAX_MB = 5;
const PHOTO_MAX_BYTES = PHOTO_MAX_MB * 1024 * 1024;
const PHOTO_ACCEPT = ['image/jpeg', 'image/png', 'image/webp'];

const cargoOptions = [
  ...CARGO_TYPES.filter((name) => name !== 'سایر').map((name) => ({
    value: name,
    label: name,
  })),
  { value: 'other', label: 'سایر' },
];

const knownCargo = new Set(CARGO_TYPES.filter((name) => name !== 'سایر'));

function money(value) {
  if (value == null || value === '') return '—';
  const grouped = formatGroupedDigits(value);
  return grouped ? `${grouped} تومان` : '—';
}

function resolveCargoSelection(rawType, otherText = '') {
  const type = String(rawType || '').trim();
  const other = String(otherText || '').trim();
  if (!type) return { actualCargoType: '', actualCargoTypeOther: '' };
  if (type === 'other' || type === 'سایر') {
    return { actualCargoType: 'other', actualCargoTypeOther: other };
  }
  if (knownCargo.has(type)) {
    return { actualCargoType: type, actualCargoTypeOther: '' };
  }
  const wrapped = type.match(/^سایر\s*\((.+)\)\s*$/);
  if (wrapped) return { actualCargoType: 'other', actualCargoTypeOther: wrapped[1] };
  return { actualCargoType: 'other', actualCargoTypeOther: type };
}

export default function Visit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [mission, setMission] = useState(null);
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState('');

  function apply(next, options = {}) {
    setMission(next);
    const vehicleGap = (next.discrepancies || []).find((item) => item.field === 'vehicle');
    setForm((current) => {
      if (options.keepDraft && current) return current;
      const cargoSel = resolveCargoSelection(
        next.actualCargoType || next.cargo.typeCode || next.cargo.type,
        next.actualCargoType ? '' : (next.cargo.typeOther || ''),
      );
      return {
        checklist: next.checklist,
        weightEmpty: formatGroupedDigits(next.weights.empty ?? '', { decimal: true }),
        weightFull: formatGroupedDigits(next.weights.full ?? '', { decimal: true }),
        cargoValue: formatGroupedDigits(next.recordedCargoValue ?? next.cargo.declaredValue ?? ''),
        actualCargoType: cargoSel.actualCargoType,
        actualCargoTypeOther: cargoSel.actualCargoTypeOther,
        actualVehicle: vehicleGap?.actual || '',
        note: '',
      };
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

  async function save() {
    setError('');
    setMessage('');
    setSaving(true);
    try {
      const actualCargoType = form.actualCargoType === 'other'
        ? (form.actualCargoTypeOther.trim() || 'سایر')
        : form.actualCargoType;
      const next = await api(`/missions/${id}/report`, {
        method: 'POST',
        body: {
          checklist: form.checklist,
          weightEmpty: ungroupNumber(form.weightEmpty),
          weightFull: ungroupNumber(form.weightFull),
          cargoValue: ungroupNumber(form.cargoValue),
          actualCargoType,
          actualVehicle: form.actualVehicle,
          discrepancies: form.note ? [{ field: 'note', expected: '', actual: '', note: form.note }] : [],
          finalize: true,
        },
      });
      apply(next);
      setMessage('گزارش به مرکز عملیات رسید.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function addPhoto(kind, file) {
    if (!file) return;
    setError('');
    if (!PHOTO_ACCEPT.includes(file.type)) {
      setError('فقط تصویر JPG، PNG یا WEBP مجاز است.');
      return;
    }
    if (file.size > PHOTO_MAX_BYTES) {
      setError(`حجم عکس نباید بیشتر از ${PHOTO_MAX_MB.toLocaleString('fa-IR')} مگابایت باشد.`);
      return;
    }
    setUploading(kind);
    try {
      apply(await upload(`/missions/${id}/photos`, file, { kind }), { keepDraft: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading('');
    }
  }

  return (
    <>
      <button type="button" className="inspector-btn secondary inspector-back" onClick={() => navigate('/inspector')}>بازگشت</button>

      <article className="inspector-card">
        <p className="panel-kicker">پرونده مراجعه</p>
        <div className="inspector-row" style={{ borderBottom: 0, paddingTop: 0 }}>
          <h1>{mission.trackingCode}</h1>
          <span className={`inspector-pill ${mission.completeness.complete ? 'ok' : 'warn'}`}>
            {mission.completeness.complete ? 'آماده ادامه' : 'ناقص'}
          </span>
        </div>
        <p className="inspector-lead">{mission.workflowLabel}</p>
        <dl className="inspector-dl">
          <div>
            <dt>محل مراجعه</dt>
            <dd>{mission.visit.city}، {mission.visit.address}</dd>
          </div>
          <div>
            <dt>زمان</dt>
            <dd>{mission.visit.date ? new Date(mission.visit.date).toLocaleDateString('fa-IR') : '—'} از {mission.visit.from || '—'} تا {mission.visit.to || '—'}</dd>
          </div>
          <div>
            <dt>مقصد</dt>
            <dd>{mission.destinationCity || '—'}</dd>
          </div>
        </dl>
        <p className="inspector-muted" style={{ marginTop: 10 }}>{mission.payerNote}</p>
        {mapHref && <a className="inspector-map-link" href={mapHref} target="_blank" rel="noreferrer">مسیر روی نقشه</a>}
      </article>

      <article className="inspector-card">
        <h2>چه چیزی را باید ببینید</h2>
        <dl className="inspector-dl">
          <div>
            <dt>بار</dt>
            <dd>{mission.cargo.type}، بسته‌بندی {mission.cargo.packaging || '—'}</dd>
          </div>
          <div>
            <dt>ارزش اعلامی</dt>
            <dd>{money(mission.cargo.declaredValue)}</dd>
          </div>
          <div>
            <dt>ناوگان</dt>
            <dd>{mission.vehicle.title || '—'}{mission.vehicle.plate ? ` — ${mission.vehicle.plate}` : ''}</dd>
          </div>
          <div>
            <dt>راننده</dt>
            <dd>{mission.vehicle.driverName || 'هنوز تخصیص نشده'}</dd>
          </div>
        </dl>
        {!mission.assignedToMe && mission.canEdit && (
          <button type="button" className="inspector-btn" style={{ marginTop: 14 }} onClick={async () => {
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
        <p className="inspector-muted">سقف هر عکس {PHOTO_MAX_MB.toLocaleString('fa-IR')} مگابایت است. JPG، PNG یا WEBP.</p>
        <div className="inspector-photos">
          {PHOTOS.map(([kind, label]) => {
            const shots = mission.photos.filter((photo) => photo.kind === kind);
            return (
              <div key={kind} className="inspector-photo">
                {shots[0] ? (
                  <a href={shots[0].url} target="_blank" rel="noreferrer">
                    <img src={shots[0].url} alt={label} />
                  </a>
                ) : (
                  <div className="inspector-photo-empty">بدون عکس</div>
                )}
                <div>
                  <strong>{label}</strong>
                  <div className="inspector-muted">{shots.length ? `${shots.length.toLocaleString('fa-IR')} عکس` : 'ثبت نشده'}</div>
                </div>
                {mission.canEdit && (
                  <label className="inspector-btn secondary inspector-photo-btn">
                    {uploading === kind ? 'در حال ارسال...' : 'دوربین'}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      capture="environment"
                      hidden
                      disabled={Boolean(uploading)}
                      onChange={(event) => {
                        addPhoto(kind, event.target.files?.[0]);
                        event.target.value = '';
                      }}
                    />
                  </label>
                )}
              </div>
            );
          })}
        </div>
      </article>

      <article className="inspector-card">
        <h2>باسکول و ارزش بیمه</h2>
        <div className="inspector-fields inspector-fields-2">
          <div>
            <label className="inspector-label">وزن خالی (کیلو)</label>
            <input
              className="inspector-field"
              inputMode="decimal"
              disabled={!mission.canEdit}
              value={form.weightEmpty}
              onChange={(event) => setForm({ ...form, weightEmpty: formatGroupedDigits(event.target.value, { decimal: true }) })}
            />
          </div>
          <div>
            <label className="inspector-label">وزن پر (کیلو)</label>
            <input
              className="inspector-field"
              inputMode="decimal"
              disabled={!mission.canEdit}
              value={form.weightFull}
              onChange={(event) => setForm({ ...form, weightFull: formatGroupedDigits(event.target.value, { decimal: true }) })}
            />
          </div>
        </div>
        <p className="inspector-muted">خالص ثبت‌شده: {mission.weights.net != null ? formatGroupedDigits(mission.weights.net, { decimal: true }) : '—'}</p>
        <div className="inspector-value-block">
          <label className="inspector-label">ارزش دقیق کالا (تومان)</label>
          <input
            className="inspector-field"
            inputMode="numeric"
            dir="ltr"
            disabled={!mission.canEdit}
            value={form.cargoValue}
            onChange={(event) => setForm({ ...form, cargoValue: formatGroupedDigits(event.target.value) })}
          />
        </div>
        <div className="inspector-cargo-type">
          <SearchableSelect
            label="نوع بار در محل"
            value={form.actualCargoType}
            options={cargoOptions}
            stickyOptionValue="other"
            accent="teal"
            disabled={!mission.canEdit}
            onChange={(value) => setForm({
              ...form,
              actualCargoType: value,
              actualCargoTypeOther: value === 'other' ? form.actualCargoTypeOther : '',
            })}
            placeholder="جستجو یا انتخاب نوع کالا..."
            noResultsText="نوع کالایی با این مشخصات یافت نشد"
          />
          {form.actualCargoType === 'other' && (
            <Input
              label="توضیح نوع کالا"
              value={form.actualCargoTypeOther}
              onChange={(event) => setForm({ ...form, actualCargoTypeOther: event.target.value })}
              placeholder="نوع کالا را توضیح دهید"
              disabled={!mission.canEdit}
            />
          )}
        </div>
        <label className="inspector-label">اگر خودرو فرق دارد، نوع واقعی</label>
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
          <button type="button" className="inspector-btn gold" disabled={saving} onClick={save}>
            {saving ? 'در حال ارسال...' : 'ارسال به مرکز عملیات'}
          </button>
        )}
      </article>
    </>
  );
}
