import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api, download } from '../api';
import { useAdmin } from '../auth';
import { money, when } from '../format';
import { Badge, Page, SkeletonRows } from '../components/ui';

const ROLES = [
  ['SUPER_ADMIN', 'مدیر سامانه'],
  ['DISPATCH_OPERATOR', 'اپراتور دیسپچ'],
  ['SECURITY_OPERATOR', 'اپراتور امنیت'],
  ['INSPECTION_SUPERVISOR', 'سرپرست بازرسی'],
  ['SUPPORT_AGENT', 'پشتیبان مدارک'],
];

const DECISIONS = { PENDING: 'در انتظار', APPROVED: 'تأیید', CORRECTED: 'اصلاح شد', STOPPED: 'توقف' };

function listOf(value) {
  return Array.isArray(value) ? value : [];
}
const COMPLAINT = { pending: 'باز', reviewed: 'بررسی شد', resolved: 'حل شد', rejected: 'رد شد' };

function useLoad(loader, deps) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let alive = true;
    setData(null);
    loader()
      .then((value) => { if (alive) setData(value); })
      .catch((err) => { if (alive) setError(err.message); });
    return () => { alive = false; };
  }, deps);
  return { data, error, reload: () => loader().then(setData).catch((err) => toast.error(err.message)) };
}

function Inspections() {
  const { data, error, reload } = useLoad(() => api('/inspections'), []);
  const [notes, setNotes] = useState({});
  if (error) return <p className="muted">{error}</p>;
  if (!data) return <SkeletonRows />;
  const reports = data;

  return (
    <Page title="بازرسی و کیفیت">
      <div style={{ display: 'grid', gap: 10 }}>
        {reports.map((report) => (
            <article key={report.id} className="card" style={{ padding: 14 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <strong>{report.trackingCode}</strong>
                <Badge tone={report.decision === 'STOPPED' ? 'crit' : report.decision === 'PENDING' ? 'warn' : 'ok'}>{DECISIONS[report.decision] || report.decision}</Badge>
              </div>
              <p className="muted">{report.inspectorName || 'بدون متصدی'} — خالص {report.weightNet ?? '—'} کیلو{report.recordedCargoValue ? ` — ارزش دقیق ${Number(report.recordedCargoValue).toLocaleString('fa-IR')}` : ''}</p>
              {listOf(report.discrepancies).length > 0 && <p>مغایرت: {listOf(report.discrepancies).map((item) => (typeof item === 'string' ? item : item.note || item.field || '')).filter(Boolean).join('، ')}</p>}
              {listOf(report.photos).length > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '8px 0' }}>
                  {listOf(report.photos).map((photo) => (
                    <a key={`${photo.kind}-${photo.url}`} href={photo.url} target="_blank" rel="noreferrer">
                      <img src={photo.url} alt={photo.kind} style={{ width: 96, height: 72, objectFit: 'cover', borderRadius: 8, background: '#f7f6f0' }} />
                    </a>
                  ))}
                </div>
              )}
              {report.decision === 'PENDING' && (
                <div style={{ display: 'grid', gap: 8 }}>
                  <textarea className="area" value={notes[report.id] || ''} onChange={(event) => setNotes((current) => ({ ...current, [report.id]: event.target.value }))} placeholder="توضیح تصمیم" />
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {['APPROVED', 'CORRECTED', 'STOPPED'].map((decision) => (
                      <button key={decision} type="button" className={decision === 'STOPPED' ? 'btn secondary' : 'btn'} onClick={async () => {
                        try {
                          await api(`/inspections/${report.id}/decision`, { method: 'POST', body: { decision, note: notes[report.id] || '' } });
                          toast.success('تصمیم ثبت شد');
                          setNotes((current) => ({ ...current, [report.id]: '' }));
                          reload();
                        } catch (err) { toast.error(err.message); }
                      }}>{DECISIONS[decision]}</button>
                    ))}
                  </div>
                </div>
              )}
            </article>
          ))}
          {reports.length === 0 && <p className="muted">گزارش بازی نیست.</p>}
      </div>
    </Page>
  );
}

function Complaints() {
  const { data, error, reload } = useLoad(() => api('/complaints'), []);
  const [drafts, setDrafts] = useState({});
  if (error) return <p className="muted">{error}</p>;
  if (!data) return <SkeletonRows />;
  return (
    <Page title="تیکت‌ها و شکایت‌ها">
      <div style={{ display: 'grid', gap: 10 }}>
        {data.map((item) => (
          <article key={item.id} className="card" style={{ padding: 14 }}>
            <Badge tone={item.status === 'resolved' ? 'ok' : item.status === 'rejected' ? 'crit' : 'warn'}>{COMPLAINT[item.status] || item.status}</Badge>
            <p><strong>{item.type}</strong> — {item.trackingCode || 'بدون بار'} — {item.ownerPhone}</p>
            <p>{item.description}</p>
            {item.adminResponse && <p className="muted">پاسخ: {item.adminResponse}</p>}
            <textarea className="area" value={drafts[item.id] || ''} onChange={(event) => setDrafts({ ...drafts, [item.id]: event.target.value })} placeholder="پاسخ پشتیبانی" />
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              {['reviewed', 'resolved', 'rejected'].map((status) => (
                <button key={status} type="button" className="btn secondary" onClick={async () => {
                  try {
                    await api(`/complaints/${item.id}`, { method: 'PATCH', body: { status, adminResponse: drafts[item.id] || item.adminResponse } });
                    toast.success('تیکت به‌روز شد');
                    reload();
                  } catch (err) { toast.error(err.message); }
                }}>{COMPLAINT[status]}</button>
              ))}
            </div>
          </article>
        ))}
        {data.length === 0 && <p className="muted">تیکتی نیست.</p>}
      </div>
    </Page>
  );
}

function Reports() {
  const { can } = useAdmin();
  const [kind, setKind] = useState('operations');
  const [range, setRange] = useState({ from: '', to: '' });
  const financial = kind === 'financial' && can('reports.financial');
  const { data, error } = useLoad(() => {
    const params = new URLSearchParams();
    if (range.from) params.set('from', range.from);
    if (range.to) params.set('to', range.to);
    return api(`${financial ? '/reports/financial' : '/reports/operations'}?${params}`);
  }, [kind, range.from, range.to]);

  return (
    <Page title="گزارش‌ها" action={(
      <button type="button" className="btn gold" onClick={() => download(`/reports/export?kind=${financial ? 'financial' : 'operations'}&from=${range.from}&to=${range.to}`, financial ? 'alamut-financial.xlsx' : 'alamut-operations.xlsx').catch((err) => toast.error(err.message))}>خروجی اکسل</button>
    )}>
      <div className="form-grid" style={{ marginBottom: 12 }}>
        <select className="select" value={kind} onChange={(event) => setKind(event.target.value)}>
          <option value="operations">عملیاتی</option>
          {can('reports.financial') && <option value="financial">مالی</option>}
        </select>
        <input className="field" type="date" value={range.from} onChange={(event) => setRange({ ...range, from: event.target.value })} />
        <input className="field" type="date" value={range.to} onChange={(event) => setRange({ ...range, to: event.target.value })} />
      </div>
      {error && <p className="muted">{error}</p>}
      {!data && !error && <SkeletonRows />}
      {data && (
        <>
          <div className="stat-grid" style={{ marginBottom: 12 }}>
            <article className="card" style={{ padding: 14 }}><div className="muted">تعداد</div><strong>{(data.summary.count || 0).toLocaleString('fa-IR')}</strong></article>
            {data.summary.completed != null && <article className="card" style={{ padding: 14 }}><div className="muted">تکمیل‌شده</div><strong>{data.summary.completed.toLocaleString('fa-IR')}</strong></article>}
            {data.summary.freight != null && <article className="card" style={{ padding: 14 }}><div className="muted">کرایه</div><strong>{money(data.summary.freight)}</strong></article>}
            {data.summary.penalties != null && <article className="card" style={{ padding: 14 }}><div className="muted">جریمه</div><strong>{money(data.summary.penalties)}</strong></article>}
          </div>
          <div className="card table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>پیگیری</th><th>وضعیت</th><th>مسیر</th><th>راننده</th>
                  {financial && <th>قیمت نهایی</th>}
                  {financial && <th>جریمه</th>}
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr key={item.trackingCode}>
                    <td>{item.trackingCode}</td>
                    <td>{item.status}</td>
                    <td>{item.origin} ← {item.destination}</td>
                    <td>{item.driver || '—'}</td>
                    {financial && <td>{money(item.finalPrice)}</td>}
                    {financial && <td>{money(item.penalty)}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Page>
  );
}

function Settings() {
  const { data, error, reload } = useLoad(() => Promise.all([api('/settings'), api('/settings/history')]), []);
  const [drafts, setDrafts] = useState({});
  if (error) return <p className="muted">{error}</p>;
  if (!data) return <SkeletonRows />;
  const [rows, history] = data;
  return (
    <Page title="تنظیمات سامانه">
      <div className="split">
        <div style={{ display: 'grid', gap: 10 }}>
          {rows.map((row) => (
            <article key={row.key} className="card" style={{ padding: 14 }}>
              <strong>{row.description || row.key}</strong>
              <div className="muted">{row.key}</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <input className="field" value={drafts[row.key] ?? (row.value != null && typeof row.value === 'object' ? JSON.stringify(row.value) : String(row.value ?? ''))} onChange={(event) => setDrafts({ ...drafts, [row.key]: event.target.value })} />
                <button type="button" className="btn" onClick={async () => {
                  const raw = drafts[row.key] ?? (row.value != null && typeof row.value === 'object' ? JSON.stringify(row.value) : String(row.value ?? ''));
                  try {
                    let value = raw;
                    const text = String(raw).trim();
                    if (text.startsWith('[') || text.startsWith('{')) value = JSON.parse(text);
                    else if (text === 'true') value = true;
                    else if (text === 'false') value = false;
                    else if (text !== '' && !Number.isNaN(Number(text))) value = Number(text);
                    await api(`/settings/${row.key}`, { method: 'PATCH', body: { value } });
                    toast.success('ذخیره شد');
                    reload();
                  } catch (err) { toast.error(err.message); }
                }}>ذخیره</button>
              </div>
            </article>
          ))}
        </div>
        <article className="card" style={{ padding: 14, alignSelf: 'start' }}>
          <h3 style={{ marginTop: 0 }}>تاریخچه تغییر</h3>
          {history.map((item) => (
            <p key={item.id} className="muted">{item.entityId || item.entity_id} — {when(item.createdAt)}</p>
          ))}
          {history.length === 0 && <p className="muted">هنوز تغییری ثبت نشده.</p>}
        </article>
      </div>
    </Page>
  );
}

function RoleChecks({ roles, onToggle }) {
  return ROLES.map(([key, label]) => (
    <label key={key} style={{ display: 'flex', gap: 8 }}>
      <input type="checkbox" checked={roles.includes(key)} onChange={() => onToggle(key)} />
      {label}
    </label>
  ));
}

function Admins() {
  const { user } = useAdmin();
  const { data, error, reload } = useLoad(() => api('/admins'), []);
  const [form, setForm] = useState({ fullName: '', username: '', password: '', phone: '', roles: ['DISPATCH_OPERATOR'] });
  const [edit, setEdit] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  if (error) return <p className="muted">{error}</p>;
  if (!data) return <SkeletonRows />;

  function toggleRole(role) {
    setForm((current) => ({
      ...current,
      roles: current.roles.includes(role) ? current.roles.filter((item) => item !== role) : [...current.roles, role],
    }));
  }

  function toggleEditRole(role) {
    setEdit((current) => ({
      ...current,
      roles: current.roles.includes(role) ? current.roles.filter((item) => item !== role) : [...current.roles, role],
    }));
  }

  return (
    <Page title="اپراتورها">
      <div className="split">
        <div className="card table-wrap">
          <table className="data">
            <thead><tr><th>نام</th><th>نام کاربری</th><th>موبایل</th><th>نقش</th><th>وضعیت</th><th /></tr></thead>
            <tbody>
              {data.map((admin) => (
                <tr key={admin.id}>
                  <td>{admin.fullName}</td>
                  <td>{admin.username || '—'}</td>
                  <td>{admin.phone}</td>
                  <td>{(admin.roleLabels || []).join('، ')}</td>
                  <td>{admin.isActive ? 'فعال' : 'غیرفعال'}</td>
                  <td style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button type="button" className="btn secondary" onClick={() => { setPendingDelete(null); setEdit({ id: admin.id, fullName: admin.fullName, roles: [...(admin.roles || [])] }); }}>دسترسی</button>
                    {admin.id !== user?.id && (
                      <button type="button" className="btn secondary" onClick={async () => {
                        try {
                          await api(`/admins/${admin.id}`, { method: 'PATCH', body: { isActive: !admin.isActive } });
                          reload();
                        } catch (err) { toast.error(err.message); }
                      }}>{admin.isActive ? 'غیرفعال' : 'فعال'}</button>
                    )}
                    {admin.id !== user?.id && pendingDelete !== admin.id && (
                      <button type="button" className="btn secondary" onClick={() => setPendingDelete(admin.id)}>حذف</button>
                    )}
                    {pendingDelete === admin.id && (
                      <>
                        <button type="button" className="btn" onClick={async () => {
                          try {
                            await api(`/admins/${admin.id}`, { method: 'DELETE' });
                            toast.success('اپراتور حذف شد');
                            setPendingDelete(null);
                            if (edit?.id === admin.id) setEdit(null);
                            reload();
                          } catch (err) { toast.error(err.message); }
                        }}>حذف شود</button>
                        <button type="button" className="btn secondary" onClick={() => setPendingDelete(null)}>انصراف</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ display: 'grid', gap: 12, alignContent: 'start' }}>
          {edit && (
            <form className="card" style={{ padding: 14, display: 'grid', gap: 8 }} onSubmit={async (event) => {
              event.preventDefault();
              if (!edit.roles.length) {
                toast.error('حداقل یک نقش را انتخاب کنید.');
                return;
              }
              try {
                await api(`/admins/${edit.id}`, { method: 'PATCH', body: { roles: edit.roles } });
                toast.success('دسترسی به‌روز شد');
                setEdit(null);
                reload();
              } catch (err) { toast.error(err.message); }
            }}>
              <h3 style={{ margin: 0 }}>دسترسی {edit.fullName}</h3>
              <RoleChecks roles={edit.roles} onToggle={toggleEditRole} />
              <button type="submit" className="btn gold">ذخیرهٔ دسترسی</button>
            </form>
          )}
          <form className="card" style={{ padding: 14, display: 'grid', gap: 8 }} onSubmit={async (event) => {
            event.preventDefault();
            try {
              await api('/admins', { method: 'POST', body: form });
              toast.success('اپراتور ساخته شد');
              setForm({ fullName: '', username: '', password: '', phone: '', roles: ['DISPATCH_OPERATOR'] });
              reload();
            } catch (err) { toast.error(err.message); }
          }}>
            <h3 style={{ margin: 0 }}>اپراتور جدید</h3>
            <p className="muted">«سرپرست بازرسی» صفحهٔ بازرسی مرکز عملیات را باز می‌کند. حساب متصدی میدان را از بخش «متصدی‌ها» بسازید.</p>
            <input className="field" placeholder="نام" value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} />
            <input className="field" placeholder="نام کاربری" autoComplete="off" value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} />
            <input className="field" type="password" placeholder="رمز عبور" autoComplete="new-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
            <input className="field" placeholder="موبایل" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
            <RoleChecks roles={form.roles} onToggle={toggleRole} />
            <button type="submit" className="btn">ساخت حساب</button>
          </form>
        </div>
      </div>
    </Page>
  );
}

function Inspectors() {
  const { data, error, reload } = useLoad(() => api('/inspectors'), []);
  const [form, setForm] = useState({ fullName: '', phone: '', notes: '' });
  const [edit, setEdit] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  if (error) return <p className="muted">{error}</p>;
  if (!data) return <SkeletonRows />;

  return (
    <Page title="متصدی‌ها">
      <div className="split">
        <div className="card table-wrap">
          <table className="data">
            <thead><tr><th>نام</th><th>موبایل</th><th>یادداشت</th><th>وضعیت</th><th /></tr></thead>
            <tbody>
              {data.map((inspector) => (
                <tr key={inspector.id}>
                  <td>{inspector.fullName}</td>
                  <td>{inspector.phone}</td>
                  <td>{inspector.notes || '—'}</td>
                  <td>{inspector.isActive ? 'فعال' : 'غیرفعال'}</td>
                  <td style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button type="button" className="btn secondary" onClick={() => { setPendingDelete(null); setEdit({ id: inspector.id, fullName: inspector.fullName, phone: inspector.phone, notes: inspector.notes || '' }); }}>ویرایش</button>
                    <button type="button" className="btn secondary" onClick={async () => {
                      try {
                        await api(`/inspectors/${inspector.id}`, { method: 'PATCH', body: { isActive: !inspector.isActive } });
                        reload();
                      } catch (err) { toast.error(err.message); }
                    }}>{inspector.isActive ? 'غیرفعال' : 'فعال'}</button>
                    {pendingDelete !== inspector.id && (
                      <button type="button" className="btn secondary" onClick={() => setPendingDelete(inspector.id)}>حذف</button>
                    )}
                    {pendingDelete === inspector.id && (
                      <>
                        <button type="button" className="btn" onClick={async () => {
                          try {
                            await api(`/inspectors/${inspector.id}`, { method: 'DELETE' });
                            toast.success('متصدی حذف شد');
                            setPendingDelete(null);
                            if (edit?.id === inspector.id) setEdit(null);
                            reload();
                          } catch (err) { toast.error(err.message); }
                        }}>حذف شود</button>
                        <button type="button" className="btn secondary" onClick={() => setPendingDelete(null)}>انصراف</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr><td colSpan={5} className="muted">هنوز متصدی ثبت نشده.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div style={{ display: 'grid', gap: 12, alignContent: 'start' }}>
          {edit && (
            <form className="card" style={{ padding: 14, display: 'grid', gap: 8 }} onSubmit={async (event) => {
              event.preventDefault();
              try {
                await api(`/inspectors/${edit.id}`, { method: 'PATCH', body: { fullName: edit.fullName, phone: edit.phone, notes: edit.notes } });
                toast.success('متصدی به‌روز شد');
                setEdit(null);
                reload();
              } catch (err) { toast.error(err.message); }
            }}>
              <h3 style={{ margin: 0 }}>ویرایش {edit.fullName}</h3>
              <input className="field" placeholder="نام متصدی" value={edit.fullName} onChange={(event) => setEdit({ ...edit, fullName: event.target.value })} />
              <input className="field" placeholder="موبایل" value={edit.phone} onChange={(event) => setEdit({ ...edit, phone: event.target.value })} />
              <input className="field" placeholder="یادداشت" value={edit.notes} onChange={(event) => setEdit({ ...edit, notes: event.target.value })} />
              <button type="submit" className="btn gold">ذخیره</button>
              <button type="button" className="btn secondary" onClick={() => setEdit(null)}>انصراف</button>
            </form>
          )}
          <form className="card" style={{ padding: 14, display: 'grid', gap: 8 }} onSubmit={async (event) => {
            event.preventDefault();
            try {
              await api('/inspectors', { method: 'POST', body: form });
              toast.success('متصدی ساخته شد');
              setForm({ fullName: '', phone: '', notes: '' });
              reload();
            } catch (err) { toast.error(err.message); }
          }}>
            <h3 style={{ margin: 0 }}>متصدی جدید</h3>
            <p className="muted">ورود متصدی از مسیر /inspector با همین موبایل است. در حالت توسعه کد ۱۲۳۴۵ است.</p>
            <input className="field" placeholder="نام" value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} />
            <input className="field" placeholder="موبایل" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
            <input className="field" placeholder="یادداشت (اختیاری)" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
            <button type="submit" className="btn">ساخت حساب</button>
          </form>
        </div>
      </div>
    </Page>
  );
}

function Audit() {
  const [page, setPage] = useState(1);
  const { data, error } = useLoad(() => api(`/audit?page=${page}&limit=30`), [page]);
  if (error) return <p className="muted">{error}</p>;
  if (!data) return <SkeletonRows />;
  return (
    <Page title="گزارش اقدامات">
      <div className="card table-wrap">
        <table className="data">
          <thead><tr><th>زمان</th><th>اقدام</th><th>موجودیت</th><th>شناسه</th></tr></thead>
          <tbody>
            {data.items.map((item) => (
              <tr key={item.id}>
                <td>{when(item.createdAt)}</td>
                <td>{item.action}</td>
                <td>{item.entity}</td>
                <td>{item.entityId || item.entity_id || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button type="button" className="btn secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>قبلی</button>
        <button type="button" className="btn secondary" disabled={page * data.limit >= data.total} onClick={() => setPage(page + 1)}>بعدی</button>
      </div>
    </Page>
  );
}

const PAGES = {
  inspections: Inspections,
  complaints: Complaints,
  reports: Reports,
  settings: Settings,
  admins: Admins,
  inspectors: Inspectors,
  audit: Audit,
};

export default function OpsPages({ page }) {
  const View = PAGES[page] || Inspections;
  return <View />;
}
