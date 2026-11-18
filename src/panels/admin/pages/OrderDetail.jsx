import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';
import { toast } from 'sonner';
import { api, download, upload } from '../api';
import { useAdmin } from '../auth';
import { WORKFLOW_LABELS, money, toneOfStatus, when } from '../format';
import { formatGroupedDigits, ungroupNumber } from '../../owner/utils/digits';
import { Badge, Modal, Page, SkeletonRows } from '../components/ui';

export default function OrderDetail() {
  const { id } = useParams();
  const { can } = useAdmin();
  const [order, setOrder] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [reason, setReason] = useState('');
  const [extra, setExtra] = useState('');
  const [ready, setReady] = useState([]);
  const [manualPdf, setManualPdf] = useState(null);
  const [inspectors, setInspectors] = useState([]);
  const [waybillFile, setWaybillFile] = useState(null);
  const [waybillBusy, setWaybillBusy] = useState(false);
  const [offerPick, setOfferPick] = useState({ offerId: '', inspectorId: '', reason: '' });
  const [check, setCheck] = useState({ stage: 'loading', packagingOk: false, weightOk: false, vehicleOk: false, sealNumber: '' });
  const [docFile, setDocFile] = useState(null);
  const parentRef = useRef(null);

  useEffect(() => () => {
    if (manualPdf?.url) URL.revokeObjectURL(manualPdf.url);
  }, [manualPdf]);

  async function saveDossier() {
    if (manualPdf?.url) URL.revokeObjectURL(manualPdf.url);
    setManualPdf(null);
    toast.message('در حال ساخت پرونده…');
    try {
      const result = await download(`/orders/${id}/dossier`, `${order.trackingCode}.pdf`);
      if (result?.cancelled) return;
      if (result?.needsGesture) {
        setManualPdf({ url: result.url, filename: result.filename });
        toast.error('ساخت پرونده طول کشید و مرورگر ذخیرهٔ خودکار را رد کرد. دکمهٔ «ذخیرهٔ پرونده» را بزنید.');
        return;
      }
      toast.success('پرونده ذخیره شد');
    } catch (error) {
      toast.error(error.message);
    }
  }

  const load = () => api(`/orders/${id}`).then(setOrder);
  useEffect(() => { load().catch((error) => toast.error(error.message)); }, [id]);
  useEffect(() => {
    if (!order?.waybill?.smsSent || order.waybill.codeVerified) return undefined;
    const timer = setInterval(() => { load().catch(() => {}); }, 8000);
    return () => clearInterval(timer);
  }, [id, order?.waybill?.smsSent, order?.waybill?.codeVerified]);
  useEffect(() => {
    if (can('drivers.queue')) api('/drivers/ready').then(setReady).catch(() => {});
  }, [can]);

  const virtualizer = useVirtualizer({
    count: ready.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
  });

  async function submit() {
    try {
      if (dialog === 'status') await api(`/orders/${id}/status`, { method: 'POST', body: { workflowStatus: extra, reason } });
      if (dialog === 'price') await api(`/orders/${id}/price`, { method: 'PATCH', body: { estimatedPrice: Number(ungroupNumber(extra)), reason } });
      if (dialog === 'note') await api(`/orders/${id}/notes`, { method: 'POST', body: { kind: 'note', body: reason } });
      if (dialog === 'call') await api(`/orders/${id}/notes`, { method: 'POST', body: { kind: 'phone_call', body: reason } });
      if (dialog === 'penalty') await api(`/orders/${id}/penalty`, { method: 'POST', body: { delayMinutes: Number(extra), forceMajeure: false, reason } });
      if (dialog === 'assign') await api(`/orders/${id}/assign-driver`, { method: 'POST', body: { driverId: Number(extra), reason } });
      if (dialog === 'replace') await api(`/orders/${id}/replace-driver`, { method: 'POST', body: { driverId: Number(extra) || undefined, reason } });
      if (dialog === 'inspector') await api(`/orders/${id}/inspector`, { method: 'POST', body: { inspectorId: Number(extra) } });
      toast.success(dialog === 'assign' ? 'بار در اعلان‌های راننده قرار گرفت و تا قبول او ثبت نمی‌شود.' : 'ثبت شد');
      setDialog(null);
      setReason('');
      await load();
    } catch (error) {
      toast.error(error.message);
    }
  }

  const waybill = order?.waybill || {};

  async function sendWaybillSms() {
    setWaybillBusy(true);
    try {
      await api(`/orders/${id}/waybill`, { method: 'PATCH', body: { action: 'sms' } });
      toast.success('کد بارنامه برای راننده ارسال شد.');
      await load();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setWaybillBusy(false);
    }
  }

  async function sendWaybillPhoto() {
    if (!waybillFile) return;
    setWaybillBusy(true);
    try {
      await upload(`/orders/${id}/waybill-photo`, waybillFile);
      toast.success('عکس بارنامه بارگذاری شد.');
      setWaybillFile(null);
      await load();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setWaybillBusy(false);
    }
  }

  if (!order) return <SkeletonRows />;
  return (
    <Page title={order.trackingCode} action={<Badge tone={toneOfStatus(order.workflowStatus)}>{order.workflowLabel}</Badge>}>
      <div className="split">
        <div style={{ display: 'grid', gap: 12 }}>
          <article className="card" style={{ padding: 16 }}>
            <h2 style={{ marginTop: 0 }}>تایم‌لاین</h2>
            <ol>
              {(order.events || []).map((event) => (
                <li key={event.id}><strong>{event.actor}</strong> — {event.description} <span className="muted">{when(event.at)}</span></li>
              ))}
            </ol>
          </article>
          <article className="card" style={{ padding: 16 }}>
            <h2 style={{ marginTop: 0 }}>بار و طرف‌ها</h2>
            <p>{order.cargo.type}، {order.cargo.weightKg?.toLocaleString('fa-IR')} کیلوگرم{order.cargo.pieceCount ? `، ${order.cargo.pieceCount.toLocaleString('fa-IR')} بسته` : ''}، ارزش {money(order.cargo.value)}</p>
            {order.requiresInspector && <p>این بار حساس است و متصدی در محل لازم است.</p>}
            <p>مبدأ: {order.loading.city} — {order.loading.address}</p>
            <p>مقصد: {order.unloading.city} — {order.unloading.address}</p>
            <p>صاحب کالا: {order.owner?.companyName || order.owner?.firstName} — {order.owner?.phone}</p>
            <p>راننده: {order.driver ? `${order.driver.fullName} — ${order.driver.phone} — ${order.driver.plate}` : order.offeredDriver ? `پیشنهاد به ${order.offeredDriver.fullName} — در انتظار قبول` : 'تخصیص نشده'}</p>
            <p>متصدی: {order.inspector?.fullName || '—'}</p>
            <p>قیمت تخمینی {money(order.estimatedPrice)} / نهایی {money(order.finalPrice)}</p>
            <p>بارنامه {waybill.number || order.waybillNumber || '—'} / کد تحویل {order.deliveryOtp || '—'}</p>
            <p>بسته‌بندی: {order.cargo.packaging || '—'} — ابعاد {order.cargo.lengthCm || '—'} × {order.cargo.widthCm || '—'} × {order.cargo.heightCm || '—'} سانتی‌متر</p>
            <p>فوریت: {order.urgency || '—'} — بارگیری {order.loading.date || '—'} از {order.loading.from || '—'} تا {order.loading.to || '—'}</p>
            <p>روش بارگیری: {order.loadingMethod || '—'} — روش تخلیه: {order.unloading.method || '—'}</p>
            <p>گیرنده: {order.unloading.receiverName || '—'} — {order.unloading.receiverPhone || '—'} — کد ملی {order.unloading.receiverNationalId || '—'} — کد پستی {order.unloading.receiverPostalCode || '—'}</p>
            <p>خودرو: {order.vehicleType || '—'} {(order.vehicleVariants || []).join('، ')}</p>
            <p>بیمه بار: {order.insuranceRequested ? 'درخواست شده' : 'ندارد'}</p>
            {order.cargo.notes && <p>توضیحات: {order.cargo.notes}</p>}
            {(order.cargo.photos || []).length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {order.cargo.photos.map((photo) => <a key={photo} href={photo}><img src={photo} alt="بار" style={{ width: 96, height: 72, objectFit: 'cover', borderRadius: 8 }} /></a>)}
              </div>
            )}
            {order.rating && <p>امتیاز راننده {order.rating.driverScore ?? '—'} — امتیاز متصدی {order.rating.inspectorScore ?? '—'} {order.rating.comment && `— ${order.rating.comment}`}</p>}
          </article>
          {(order.offers || []).length > 0 && (
            <article className="card" style={{ padding: 16 }}>
              <h2 style={{ marginTop: 0 }}>پیشنهاد کرایه رانندگان</h2>
              {order.offers.map((offer) => <p key={offer.id}>{offer.driverName} — {money(offer.amount)} — {offer.status === 'accepted' ? 'پذیرفته' : offer.status === 'declined' ? 'رد شده' : 'در انتظار'} {offer.note}</p>)}
              {can('offers') && (
                <div className="form-grid">
                  <select className="select" value={offerPick.offerId} onChange={(e) => setOfferPick({ ...offerPick, offerId: e.target.value })}>
                    <option value="">پیشنهاد</option>
                    {order.offers.filter((offer) => offer.status === 'pending').map((offer) => <option key={offer.id} value={offer.id}>{offer.driverName} — {money(offer.amount)}</option>)}
                  </select>
                  <select className="select" value={offerPick.inspectorId} onChange={(e) => setOfferPick({ ...offerPick, inspectorId: e.target.value })} onFocus={() => { if (!inspectors.length) api('/inspectors').then(setInspectors).catch(() => {}); }}>
                    <option value="">متصدی همراه</option>
                    {inspectors.map((item) => <option key={item.id} value={item.id}>{item.fullName}</option>)}
                  </select>
                  <input className="field" placeholder="دلیل پذیرش" value={offerPick.reason} onChange={(e) => setOfferPick({ ...offerPick, reason: e.target.value })} />
                  <button type="button" className="btn" onClick={async () => {
                    try {
                      await api(`/orders/${id}/offers`, { method: 'POST', body: { offerId: Number(offerPick.offerId), inspectorId: Number(offerPick.inspectorId), reason: offerPick.reason } });
                      toast.success('پیشنهاد پذیرفته و راننده با متصدی تخصیص شد');
                      load();
                    } catch (error) { toast.error(error.message); }
                  }}>پذیرش پیشنهاد</button>
                </div>
              )}
            </article>
          )}
          <article className="card" style={{ padding: 16 }}>
            <h2 style={{ marginTop: 0 }}>بایگانی مدارک محموله</h2>
            {(order.documents || []).map((doc) => <p key={doc.id}><a href={doc.url}>{doc.name}</a></p>)}
            {(order.documents || []).length === 0 && <p className="muted">مدرکی در بایگانی نیست.</p>}
            {can('orders.documents') && (
              <div className="form-grid">
                <input type="file" accept="application/pdf,image/jpeg,image/png" onChange={(e) => setDocFile(e.target.files?.[0] || null)} />
                <button type="button" className="btn secondary" disabled={!docFile} onClick={async () => {
                  try { await upload(`/orders/${id}/documents`, docFile); toast.success('مدرک بایگانی شد'); setDocFile(null); load(); }
                  catch (error) { toast.error(error.message); }
                }}>بارگذاری PDF یا تصویر تا ۱۰ مگابایت</button>
              </div>
            )}
          </article>
          {order.invoice && (
            <article className="card" style={{ padding: 16 }}>
              <h2 style={{ marginTop: 0 }}>صورتحساب</h2>
              <p>مبلغ {money(order.invoice.amount)} — پرداخت‌شده {money(order.invoice.paid)} — مانده {money(order.invoice.remaining)} — {order.invoice.status === 'paid' ? 'تسویه شده' : 'مانده دارد'}</p>
            </article>
          )}
          {(order.incidents || []).length > 0 && (
            <article className="card" style={{ padding: 16 }}>
              <h2 style={{ marginTop: 0 }}>رخدادهای این بار</h2>
              {order.incidents.map((item) => <p key={item.id}><Badge tone={item.severity === 'critical' ? 'crit' : 'warn'}>{item.kind}</Badge> {item.description} — {item.status}</p>)}
            </article>
          )}
          {can('inspections') && (
            <article className="card" style={{ padding: 16 }}>
              <h2 style={{ marginTop: 0 }}>چک‌لیست بازرسی</h2>
              <div className="form-grid">
                <select className="select" value={check.stage} onChange={(e) => setCheck({ ...check, stage: e.target.value })}>
                  <option value="loading">بارگیری</option>
                  <option value="delivery">تحویل</option>
                </select>
                <label><input type="checkbox" checked={check.packagingOk} onChange={(e) => setCheck({ ...check, packagingOk: e.target.checked })} /> بسته‌بندی سالم</label>
                <label><input type="checkbox" checked={check.weightOk} onChange={(e) => setCheck({ ...check, weightOk: e.target.checked })} /> وزن مطابق</label>
                <label><input type="checkbox" checked={check.vehicleOk} onChange={(e) => setCheck({ ...check, vehicleOk: e.target.checked })} /> خودرو مناسب</label>
                <input className="field" placeholder="شماره پلمب" value={check.sealNumber} onChange={(e) => setCheck({ ...check, sealNumber: e.target.value })} />
                <button type="button" className="btn" onClick={async () => {
                  try { await api(`/orders/${id}/checklist`, { method: 'POST', body: check }); toast.success('چک‌لیست ثبت شد'); load(); }
                  catch (error) { toast.error(error.message); }
                }}>ثبت چک‌لیست</button>
              </div>
              {(order.inspections || []).filter((item) => item.stage).map((item) => (
                <p key={item.id} className="muted">{item.stage === 'delivery' ? 'تحویل' : 'بارگیری'} — پلمب {item.sealNumber || '—'} — {item.passed ? 'قبول' : 'ناقص'}</p>
              ))}
            </article>
          )}
          {can('orders.waybill') && (
            <article className="card" style={{ padding: 16 }}>
              <h2 style={{ marginTop: 0 }}>بارنامه</h2>
              {!waybill.smsSent && (
                <button type="button" className="btn" disabled={waybillBusy} onClick={sendWaybillSms}>
                  {waybillBusy ? 'در حال ارسال…' : 'ارسال کد بارنامه برای راننده'}
                </button>
              )}
              {waybill.smsSent && (
                <p>کد پیامک‌شده: <strong style={{ letterSpacing: '0.2em' }}>{waybill.smsCode}</strong></p>
              )}
              {waybill.smsSent && !waybill.codeVerified && (
                <p className="muted">راننده باید این کد را در بخش بارنامه وارد کند.</p>
              )}
              {waybill.codeVerified && !waybill.photoUrl && (
                <div style={{ display: 'grid', gap: 8 }}>
                  <p>کد راننده تأیید شد. عکس بارنامه را بارگذاری کنید.</p>
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setWaybillFile(event.target.files?.[0] || null)} />
                  <button type="button" className="btn" disabled={waybillBusy || !waybillFile} onClick={sendWaybillPhoto}>
                    {waybillBusy ? 'در حال بارگذاری…' : 'بارگذاری عکس بارنامه'}
                  </button>
                </div>
              )}
              {waybill.photoUrl && (
                <div style={{ display: 'grid', gap: 8 }}>
                  <p className="muted">عکس بارنامه برای راننده قابل مشاهده است.</p>
                  <img src={waybill.photoUrl} alt="بارنامه" style={{ width: '100%', borderRadius: 12, background: '#fff' }} />
                </div>
              )}
            </article>
          )}
          {(order.alertItems || []).length > 0 && (
            <article className="card" style={{ padding: 16 }}>
              <h2 style={{ marginTop: 0 }}>هشدارهای مرتبط</h2>
              {order.alertItems.map((alert) => <p key={alert.id}><Badge tone={alert.severity === 'critical' ? 'crit' : 'warn'}>{alert.message}</Badge></p>)}
            </article>
          )}
        </div>
        <div style={{ display: 'grid', gap: 12, alignContent: 'start' }}>
          {can('orders.update') && <button type="button" className="btn" onClick={() => setDialog('status')}>تغییر وضعیت</button>}
          {can('orders.price') && <button type="button" className="btn secondary" onClick={() => { setExtra(order.estimatedPrice != null ? formatGroupedDigits(order.estimatedPrice) : ''); setDialog('price'); }}>اصلاح قیمت</button>}
          {can('orders.assign') && <button type="button" className="btn secondary" onClick={() => { setExtra(''); setDialog('assign'); }}>اعلان برای رانندهٔ خاص</button>}
          {can('orders.assign') && <button type="button" className="btn secondary" onClick={() => setDialog('replace')}>جایگزینی راننده</button>}
          {can('inspections') && <button type="button" className="btn secondary" onClick={() => { setDialog('inspector'); api('/inspectors').then(setInspectors).catch((error) => toast.error(error.message)); }}>تخصیص متصدی</button>}
          {can('orders.notes') && <button type="button" className="btn secondary" onClick={() => setDialog('call')}>ثبت تماس</button>}
          {can('orders.notes') && <button type="button" className="btn secondary" onClick={() => setDialog('note')}>یادداشت</button>}
          {can('orders.waybill') && <button type="button" className="btn secondary" disabled={waybillBusy} onClick={sendWaybillSms}>{waybill.smsSent ? 'ارسال دوباره کد بارنامه' : 'ارسال کد بارنامه'}</button>}
          {can('orders.penalty') && <button type="button" className="btn secondary" onClick={() => setDialog('penalty')}>جریمه تأخیر</button>}
          <button type="button" className="btn gold" onClick={saveDossier}>دانلود پرونده</button>
          {manualPdf && (
            <a className="btn gold" href={manualPdf.url} download={manualPdf.filename}>ذخیرهٔ پرونده</a>
          )}
          {can('drivers.queue') && (
            <div className="card" style={{ padding: 12 }}>
              <strong>صف آماده</strong>
              <div ref={parentRef} style={{ height: 180, overflow: 'auto', marginTop: 8 }}>
                <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
                  {virtualizer.getVirtualItems().map((item) => (
                    <button type="button" key={item.key} className="nav-link" style={{ position: 'absolute', top: 0, transform: `translateY(${item.start}px)`, width: '100%' }} onClick={() => { setExtra(String(ready[item.index].id)); setDialog('assign'); }}>
                      {ready[item.index].fullName}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <Modal open={Boolean(dialog)} title="ثبت عملیات" onClose={() => setDialog(null)}>
        {dialog === 'status' && (
          <select className="select" value={extra} onChange={(event) => setExtra(event.target.value)}>
            <option value="">وضعیت جدید</option>
            {Object.entries(WORKFLOW_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        )}
        {dialog === 'price' && (
          <input className="field" style={{ marginTop: 8 }} inputMode="numeric" placeholder="قیمت به تومان" value={extra} onChange={(event) => setExtra(formatGroupedDigits(event.target.value))} />
        )}
        {dialog === 'penalty' && (
          <input className="field" style={{ marginTop: 8 }} placeholder="مقدار" value={extra} onChange={(event) => setExtra(event.target.value)} />
        )}
        {(dialog === 'assign' || dialog === 'replace') && (
          <select className="select" style={{ marginTop: 8 }} value={extra} onChange={(event) => setExtra(event.target.value)}>
            <option value="">{dialog === 'replace' ? 'رانندهٔ جایگزین از صف آماده' : 'رانندهٔ آماده'}</option>
            {ready.map((driver) => <option key={driver.id} value={driver.id}>{driver.fullName}</option>)}
          </select>
        )}
        {dialog === 'inspector' && (
          <select className="select" style={{ marginTop: 8 }} value={extra} onChange={(event) => setExtra(event.target.value)}>
            <option value="">متصدی</option>
            {inspectors.filter((person) => person.isActive !== false).map((person) => <option key={person.id} value={person.id}>{person.fullName}</option>)}
          </select>
        )}
        {dialog !== 'inspector' && <textarea className="area" style={{ marginTop: 8 }} placeholder="دلیل" value={reason} onChange={(event) => setReason(event.target.value)} />}
        <button type="button" className="btn" style={{ marginTop: 8 }} onClick={submit}>تأیید</button>
      </Modal>
    </Page>
  );
}
