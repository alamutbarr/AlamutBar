import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';
import { toast } from 'sonner';
import { api, download } from '../api';
import { useAdmin } from '../auth';
import { WORKFLOW_LABELS, money, toneOfStatus, when } from '../format';
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
      if (dialog === 'price') await api(`/orders/${id}/price`, { method: 'PATCH', body: { estimatedPrice: Number(extra), reason } });
      if (dialog === 'note') await api(`/orders/${id}/notes`, { method: 'POST', body: { kind: 'note', body: reason } });
      if (dialog === 'call') await api(`/orders/${id}/notes`, { method: 'POST', body: { kind: 'phone_call', body: reason } });
      if (dialog === 'waybill') await api(`/orders/${id}/waybill`, { method: 'PATCH', body: { waybillNumber: extra } });
      if (dialog === 'penalty') await api(`/orders/${id}/penalty`, { method: 'POST', body: { delayMinutes: Number(extra), forceMajeure: false, reason } });
      if (dialog === 'assign') await api(`/orders/${id}/assign-driver`, { method: 'POST', body: { driverId: Number(extra), reason } });
      if (dialog === 'replace') await api(`/orders/${id}/replace-driver`, { method: 'POST', body: { driverId: Number(extra) || undefined, reason } });
      if (dialog === 'inspector') await api(`/orders/${id}/inspector`, { method: 'POST', body: { inspectorId: Number(extra) } });
      toast.success('ثبت شد');
      setDialog(null);
      setReason('');
      await load();
    } catch (error) {
      toast.error(error.message);
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
            <p>راننده: {order.driver ? `${order.driver.fullName} — ${order.driver.phone} — ${order.driver.plate}` : 'تخصیص نشده'}</p>
            <p>متصدی: {order.inspector?.fullName || '—'}</p>
            <p>قیمت تخمینی {money(order.estimatedPrice)} / نهایی {money(order.finalPrice)}</p>
            <p>بارنامه {order.waybillNumber || '—'} / کد تحویل {order.deliveryOtp || '—'}</p>
          </article>
          {(order.alertItems || []).length > 0 && (
            <article className="card" style={{ padding: 16 }}>
              <h2 style={{ marginTop: 0 }}>هشدارهای مرتبط</h2>
              {order.alertItems.map((alert) => <p key={alert.id}><Badge tone={alert.severity === 'critical' ? 'crit' : 'warn'}>{alert.message}</Badge></p>)}
            </article>
          )}
        </div>
        <div style={{ display: 'grid', gap: 12, alignContent: 'start' }}>
          {can('orders.update') && <button type="button" className="btn" onClick={() => setDialog('status')}>تغییر وضعیت</button>}
          {can('orders.price') && <button type="button" className="btn secondary" onClick={() => setDialog('price')}>اصلاح قیمت</button>}
          {can('orders.assign') && <button type="button" className="btn secondary" onClick={() => setDialog('assign')}>تخصیص از صف آماده</button>}
          {can('orders.assign') && <button type="button" className="btn secondary" onClick={() => setDialog('replace')}>جایگزینی راننده</button>}
          {can('inspections') && <button type="button" className="btn secondary" onClick={() => { setDialog('inspector'); api('/inspectors').then(setInspectors).catch((error) => toast.error(error.message)); }}>تخصیص متصدی</button>}
          {can('orders.notes') && <button type="button" className="btn secondary" onClick={() => setDialog('call')}>ثبت تماس</button>}
          {can('orders.notes') && <button type="button" className="btn secondary" onClick={() => setDialog('note')}>یادداشت</button>}
          {can('orders.waybill') && <button type="button" className="btn secondary" onClick={() => setDialog('waybill')}>بارنامه و کد تحویل</button>}
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
        {(dialog === 'price' || dialog === 'penalty' || dialog === 'waybill') && (
          <input className="field" style={{ marginTop: 8 }} placeholder={dialog === 'waybill' ? 'شماره بارنامه' : 'مقدار'} value={extra} onChange={(event) => setExtra(event.target.value)} />
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
        {dialog !== 'waybill' && dialog !== 'inspector' && <textarea className="area" style={{ marginTop: 8 }} placeholder="دلیل" value={reason} onChange={(event) => setReason(event.target.value)} />}
        <button type="button" className="btn" style={{ marginTop: 8 }} onClick={submit}>تأیید</button>
      </Modal>
    </Page>
  );
}
