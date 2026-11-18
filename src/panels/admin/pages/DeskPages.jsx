import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '../api';
import { money, when } from '../format';
import { Badge, Page, SkeletonRows } from '../components/ui';

const STAGES = [
  ['new', 'جدید'],
  ['qualified', 'نیازسنجی'],
  ['proposal', 'پیشنهاد ارسال شده'],
  ['won', 'تبدیل به مشتری'],
  ['lost', 'از دست رفته'],
];
const KINDS = [
  ['delay', 'تأخیر'],
  ['breakdown', 'خرابی خودرو'],
  ['damage', 'آسیب بار'],
  ['shortage', 'کسری بار'],
  ['other', 'سایر'],
];
const STAGE_LABEL = Object.fromEntries(STAGES);
const KIND_LABEL = Object.fromEntries(KINDS);

function useLoad(loader, deps) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let alive = true;
    setData(null);
    loader().then((value) => { if (alive) setData(value); }).catch((err) => { if (alive) setError(err.message); });
    return () => { alive = false; };
  }, deps);
  return { data, error, reload: () => loader().then(setData).catch((err) => toast.error(err.message)) };
}

function CrmPage() {
  const [query, setQuery] = useState({ q: '', stage: '' });
  const { data, error, reload } = useLoad(() => api(`/crm/leads?q=${encodeURIComponent(query.q)}&stage=${query.stage}`), [query.q, query.stage]);
  const followups = useLoad(() => api('/crm/followups'), []);
  const [form, setForm] = useState({ name: '', company: '', phone: '', stage: 'new', description: '' });
  const [activity, setActivity] = useState({ leadId: '', kind: 'call', body: '' });
  const [follow, setFollow] = useState({ title: '', dueAt: '', leadId: '' });
  if (error) return <Page title="CRM"><p>{error}</p></Page>;
  if (!data) return <SkeletonRows />;
  return (
    <Page title="CRM و پیگیری‌ها" action={<button type="button" className="btn" onClick={async () => {
      try { await api('/crm/leads', { method: 'POST', body: form }); toast.success('سرنخ ذخیره شد'); setForm({ name: '', company: '', phone: '', stage: 'new', description: '' }); reload(); }
      catch (err) { toast.error(err.message); }
    }}>ثبت سرنخ</button>}>
      <div className="form-grid" style={{ marginBottom: 12 }}>
        <input className="field" placeholder="نام" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className="field" placeholder="شرکت" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
        <input className="field" placeholder="موبایل" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <select className="select" value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
          {STAGES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <input className="field" placeholder="نیاز و توضیحات" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </div>
      <div className="form-grid" style={{ marginBottom: 12 }}>
        <input className="field" placeholder="جست‌وجوی نام، شرکت یا شماره" value={query.q} onChange={(e) => setQuery({ ...query, q: e.target.value })} />
        <select className="select" value={query.stage} onChange={(e) => setQuery({ ...query, stage: e.target.value })}>
          <option value="">همه مراحل</option>
          {STAGES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>
      <div style={{ display: 'grid', gap: 10 }}>
        {data.map((lead) => (
          <article key={lead.id} className="card" style={{ padding: 14 }}>
            <strong>{lead.name}</strong> <Badge>{STAGE_LABEL[lead.stage] || lead.stage}</Badge>
            <p className="muted">{lead.company || 'بدون شرکت'} — {lead.phone} — {lead.source === 'website' ? 'فرم سایت' : 'دستی'}</p>
            <p>{lead.description}</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {STAGES.map(([value, label]) => (
                <button key={value} type="button" className="btn secondary" onClick={async () => {
                  try { await api('/crm/leads', { method: 'POST', body: { ...lead, stage: value } }); reload(); }
                  catch (err) { toast.error(err.message); }
                }}>{label}</button>
              ))}
            </div>
            {(lead.activities || []).slice(0, 3).map((item) => <p key={item.id} className="muted">{item.kind}: {item.body}</p>)}
          </article>
        ))}
        {data.length === 0 && <p className="muted">سرنخی پیدا نشد. درخواست‌های فرم سایت هم اینجا می‌آیند.</p>}
      </div>
      <h2>ثبت تماس و یادداشت</h2>
      <div className="form-grid">
        <input className="field" placeholder="شناسه سرنخ" value={activity.leadId} onChange={(e) => setActivity({ ...activity, leadId: e.target.value })} />
        <select className="select" value={activity.kind} onChange={(e) => setActivity({ ...activity, kind: e.target.value })}>
          <option value="call">تماس</option>
          <option value="note">یادداشت</option>
          <option value="meeting">جلسه</option>
        </select>
        <input className="field" placeholder="شرح ارتباط و نتیجه" value={activity.body} onChange={(e) => setActivity({ ...activity, body: e.target.value })} />
        <button type="button" className="btn" onClick={async () => {
          try { await api(`/crm/leads/${activity.leadId}/activities`, { method: 'POST', body: activity }); toast.success('ثبت شد'); reload(); }
          catch (err) { toast.error(err.message); }
        }}>ثبت ارتباط</button>
      </div>
      <h2>پیگیری‌ها</h2>
      <div className="form-grid" style={{ marginBottom: 8 }}>
        <input className="field" placeholder="موضوع پیگیری" value={follow.title} onChange={(e) => setFollow({ ...follow, title: e.target.value })} />
        <input className="field" type="datetime-local" value={follow.dueAt} onChange={(e) => setFollow({ ...follow, dueAt: e.target.value })} />
        <input className="field" placeholder="شناسه سرنخ (اختیاری)" value={follow.leadId} onChange={(e) => setFollow({ ...follow, leadId: e.target.value })} />
        <button type="button" className="btn" onClick={async () => {
          try {
            await api('/crm/followups', { method: 'POST', body: { ...follow, dueAt: new Date(follow.dueAt).toISOString() } });
            toast.success('پیگیری ثبت شد');
            followups.reload();
          } catch (err) { toast.error(err.message); }
        }}>برنامه‌ریزی پیگیری</button>
      </div>
      {(followups.data || []).map((item) => (
        <p key={item.id}>
          {item.title} — {when(item.dueAt)} {item.overdue && <Badge tone="crit">عقب‌افتاده</Badge>} {item.done && <Badge tone="ok">انجام شده</Badge>}
          <button type="button" className="btn secondary" style={{ marginInlineStart: 8 }} onClick={async () => {
            await api(`/crm/followups/${item.id}`, { method: 'PATCH', body: { done: !item.done } });
            followups.reload();
          }}>{item.done ? 'بازگشایی' : 'انجام شد'}</button>
        </p>
      ))}
    </Page>
  );
}

function ArticlesPage() {
  const [q, setQ] = useState('');
  const { data, error, reload } = useLoad(() => api(`/articles?q=${encodeURIComponent(q)}`), [q]);
  const [form, setForm] = useState({ title: '', slug: '', summary: '', body: '', category: 'راهنمای حمل', status: 'draft', publishedAt: '' });
  if (error) return <Page title="مقالات"><p>{error}</p></Page>;
  if (!data) return <SkeletonRows />;
  return (
    <Page title="مرکز محتوا">
      <div className="form-grid">
        <input className="field" placeholder="عنوان مقاله" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <input className="field" placeholder="نشانی انگلیسی یکتا" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
        <input className="field" placeholder="دسته‌بندی" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
        <select className="select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
          <option value="draft">پیش‌نویس</option>
          <option value="published">انتشار عمومی</option>
        </select>
        <input className="field" type="datetime-local" value={form.publishedAt} onChange={(e) => setForm({ ...form, publishedAt: e.target.value })} />
        <input className="field" placeholder="خلاصه برای فهرست و سئو" value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
        <textarea className="area" placeholder="متن مقاله" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
        <button type="button" className="btn" onClick={async () => {
          try {
            await api('/articles', { method: 'POST', body: { ...form, id: form.id, publishedAt: form.publishedAt ? new Date(form.publishedAt).toISOString() : null } });
            toast.success('مقاله ذخیره شد');
            setForm({ title: '', slug: '', summary: '', body: '', category: 'راهنمای حمل', status: 'draft', publishedAt: '' });
            reload();
          } catch (err) { toast.error(err.message); }
        }}>ذخیره مقاله</button>
      </div>
      <input className="field" style={{ margin: '12px 0' }} placeholder="جست‌وجوی عنوان" value={q} onChange={(e) => setQ(e.target.value)} />
      {data.map((article) => (
        <article key={article.id} className="card" style={{ padding: 14, marginBottom: 8 }}>
          <strong>{article.title}</strong> <Badge>{article.phase === 'scheduled' ? 'زمان‌بندی‌شده' : article.phase === 'published' ? 'منتشرشده' : 'پیش‌نویس'}</Badge>
          <p className="muted">{article.category} — /articles/{article.slug}</p>
          <button type="button" className="btn secondary" onClick={() => setForm({
            ...article,
            publishedAt: article.publishedAt ? article.publishedAt.slice(0, 16) : '',
          })}>ویرایش</button>
          {article.phase === 'published' && <a href={`/articles/${article.slug}`} style={{ marginInlineStart: 8 }}>نمایش عمومی</a>}
        </article>
      ))}
    </Page>
  );
}

function IncidentsPage() {
  const { data, error, reload } = useLoad(() => api('/incidents'), []);
  const [form, setForm] = useState({ shipmentId: '', kind: 'delay', severity: 'normal', description: '' });
  if (error) return <Page title="رخدادها"><p>{error}</p></Page>;
  if (!data) return <SkeletonRows />;
  return (
    <Page title="رخدادها و مغایرت‌ها">
      <p className="muted">رخداد بحرانیِ باز، شروع حرکت و تکمیل همان بار را متوقف می‌کند.</p>
      <div className="form-grid" style={{ marginBottom: 12 }}>
        <input className="field" placeholder="شناسه محموله" value={form.shipmentId} onChange={(e) => setForm({ ...form, shipmentId: e.target.value })} />
        <select className="select" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
          {KINDS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select className="select" value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
          <option value="normal">عادی</option>
          <option value="critical">بحرانی؛ توقف ادامه عملیات</option>
        </select>
        <input className="field" placeholder="شرح دقیق رخداد" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <button type="button" className="btn" onClick={async () => {
          try { await api('/incidents', { method: 'POST', body: { ...form, shipmentId: Number(form.shipmentId) } }); toast.success('رخداد ثبت شد'); reload(); }
          catch (err) { toast.error(err.message); }
        }}>ثبت رخداد</button>
      </div>
      {data.map((item) => (
        <article key={item.id} className="card" style={{ padding: 14, marginBottom: 8 }}>
          <Badge tone={item.severity === 'critical' ? 'crit' : 'warn'}>{KIND_LABEL[item.kind] || item.kind}</Badge>
          <strong style={{ marginInlineStart: 8 }}>{item.trackingCode || item.shipmentId}</strong>
          <p>{item.description}</p>
          <p className="muted">{item.status} {item.resolution && `— ${item.resolution}`}</p>
          {item.status !== 'resolved' && (
            <Resolve item={item} onDone={reload} />
          )}
        </article>
      ))}
      {data.length === 0 && <p className="muted">رخدادی ثبت نشده است.</p>}
    </Page>
  );
}

function Resolve({ item, onDone }) {
  const [resolution, setResolution] = useState('');
  return (
    <div className="form-grid">
      <input className="field" placeholder="اقدام اصلاحی و نتیجه" value={resolution} onChange={(e) => setResolution(e.target.value)} />
      <button type="button" className="btn secondary" onClick={async () => {
        try { await api(`/incidents/${item.id}`, { method: 'PATCH', body: { status: 'resolved', resolution } }); toast.success('بسته شد'); onDone(); }
        catch (err) { toast.error(err.message); }
      }}>ثبت نتیجه و بستن</button>
    </div>
  );
}

function FinancePage() {
  const summary = useLoad(() => api('/finance/summary'), []);
  const { data, error, reload } = useLoad(() => api('/finance/invoices'), []);
  const [pay, setPay] = useState({ id: '', amount: '', reference: '' });
  if (error) return <Page title="امور مالی"><p>{error}</p></Page>;
  if (!data || !summary.data) return <SkeletonRows />;
  return (
    <Page title="حسابداری و تسویه محموله‌ها">
      <div className="stat-grid" style={{ marginBottom: 12 }}>
        <article className="card" style={{ padding: 14 }}><div className="muted">مجموع دریافتی</div><strong>{money(summary.data.received)}</strong></article>
        <article className="card" style={{ padding: 14 }}><div className="muted">مانده قابل تسویه</div><strong>{money(summary.data.outstanding)}</strong></article>
      </div>
      <div className="form-grid" style={{ marginBottom: 12 }}>
        <input className="field" placeholder="شناسه صورتحساب" value={pay.id} onChange={(e) => setPay({ ...pay, id: e.target.value })} />
        <input className="field" placeholder="مبلغ پرداخت (تومان)" value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} />
        <input className="field" placeholder="شماره مرجع" value={pay.reference} onChange={(e) => setPay({ ...pay, reference: e.target.value })} />
        <button type="button" className="btn" onClick={async () => {
          try {
            await api(`/finance/invoices/${pay.id}/payments`, { method: 'POST', body: { amount: Number(pay.amount), reference: pay.reference } });
            toast.success('پرداخت ثبت شد');
            reload();
            summary.reload();
          } catch (err) { toast.error(err.message); }
        }}>ثبت پرداخت</button>
      </div>
      {data.map((row) => (
        <article key={row.id} className="card" style={{ padding: 14, marginBottom: 8 }}>
          <Link to={`/admin/orders/${row.shipmentId}`}>{row.trackingCode || row.shipmentId}</Link>
          <p>مبلغ {money(row.amount)} — پرداخت‌شده {money(row.paid)} — مانده {money(row.remaining)} — {row.status === 'paid' ? 'تسویه شده' : 'پرداخت نشده'}</p>
          {(row.payments || []).map((item) => <p key={item.id} className="muted">{money(item.amount)} — {item.reference} — {when(item.createdAt)}</p>)}
        </article>
      ))}
      {data.length === 0 && <p className="muted">صورتحسابی صادر نشده است. با تکمیل مأموریت، صورتحساب ساخته می‌شود.</p>}
    </Page>
  );
}

function TicketsPage() {
  const { data, error, reload } = useLoad(() => api('/tickets'), []);
  const [form, setForm] = useState({ subject: '', priority: 'normal', phone: '', body: '' });
  const [reply, setReply] = useState({});
  if (error) return <Page title="پشتیبانی"><p>{error}</p></Page>;
  if (!data) return <SkeletonRows />;
  return (
    <Page title="مرکز پشتیبانی">
      <div className="form-grid" style={{ marginBottom: 12 }}>
        <input className="field" placeholder="موضوع درخواست" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
        <select className="select" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
          <option value="normal">عادی</option>
          <option value="urgent">فوری</option>
        </select>
        <input className="field" placeholder="موبایل صاحب درخواست" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <input className="field" placeholder="توضیح درخواست" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
        <button type="button" className="btn" onClick={async () => {
          try { await api('/tickets', { method: 'POST', body: form }); toast.success('تیکت ثبت شد'); reload(); }
          catch (err) { toast.error(err.message); }
        }}>تیکت جدید</button>
      </div>
      {data.map((ticket) => (
        <article key={ticket.id} className="card" style={{ padding: 14, marginBottom: 8 }}>
          <strong>{ticket.subject}</strong> <Badge tone={ticket.priority === 'urgent' ? 'crit' : 'idle'}>{ticket.priority === 'urgent' ? 'فوری' : 'عادی'}</Badge> <Badge>{ticket.status === 'closed' ? 'بسته' : 'باز'}</Badge>
          <p className="muted">{ticket.phone}</p>
          {(ticket.messages || []).map((message) => <p key={message.id}>{message.authorName}: {message.body}</p>)}
          {ticket.status !== 'closed' && (
            <div className="form-grid">
              <input className="field" placeholder="پاسخ شما" value={reply[ticket.id] || ''} onChange={(e) => setReply({ ...reply, [ticket.id]: e.target.value })} />
              <button type="button" className="btn secondary" onClick={async () => {
                try { await api(`/tickets/${ticket.id}/replies`, { method: 'POST', body: { body: reply[ticket.id] } }); reload(); }
                catch (err) { toast.error(err.message); }
              }}>ارسال پاسخ</button>
              <button type="button" className="btn secondary" onClick={async () => {
                try { await api(`/tickets/${ticket.id}/close`, { method: 'POST', body: {} }); reload(); }
                catch (err) { toast.error(err.message); }
              }}>بستن تیکت</button>
            </div>
          )}
        </article>
      ))}
      {data.length === 0 && <p className="muted">درخواستی ندارید.</p>}
    </Page>
  );
}

function NoticesPage() {
  const { data, error, reload } = useLoad(() => api('/notifications'), []);
  if (error) return <Page title="اعلان‌ها"><p>{error}</p></Page>;
  if (!data) return <SkeletonRows />;
  return (
    <Page title="اعلان‌ها" action={<button type="button" className="btn" onClick={async () => { await api('/notifications/read', { method: 'POST', body: {} }); reload(); }}>همه را خواندم</button>}>
      {data.map((item) => (
        <article key={item.id} className="card" style={{ padding: 14, marginBottom: 8 }}>
          <strong>{item.title}</strong> {!item.isRead && <Badge tone="warn">جدید</Badge>}
          <p>{item.body}</p>
          <p className="muted">{when(item.createdAt)} {item.shipmentId && <Link to={`/admin/orders/${item.shipmentId}`}>مشاهده بار</Link>}</p>
        </article>
      ))}
      {data.length === 0 && <p className="muted">اعلان تازه‌ای نیست.</p>}
    </Page>
  );
}

function ContactsPage() {
  const contacts = useLoad(() => api('/contacts'), []);
  const emails = useLoad(() => api('/emails'), []);
  if (contacts.error) return <Page title="درخواست‌ها"><p>{contacts.error}</p></Page>;
  if (!contacts.data) return <SkeletonRows />;
  return (
    <Page title="رویدادها و درخواست‌ها">
      <h2>درخواست‌های تماس</h2>
      {contacts.data.map((item) => (
        <article key={item.id} className="card" style={{ padding: 14, marginBottom: 8 }}>
          <strong>{item.name}</strong> — {item.phone} {item.company && `— ${item.company}`}
          <p>{item.message}</p>
          <p className="muted">سرنخ {item.leadId} — {when(item.createdAt)}</p>
        </article>
      ))}
      {contacts.data.length === 0 && <p className="muted">درخواست تازه‌ای نیست.</p>}
      <h2>صف ایمیل</h2>
      {(emails.data || []).map((item) => (
        <p key={item.id}>{item.subject} — {item.status} — {item.recipient}
          {item.body ? ` — ${item.body}` : ''}
          <button type="button" className="btn secondary" style={{ marginInlineStart: 8 }} onClick={async () => {
            await api(`/emails/${item.id}`, { method: 'PATCH', body: { status: item.status === 'pending' ? 'sent' : 'failed' } });
            emails.reload();
          }}>{item.status === 'pending' ? 'ارسال شد' : 'ناموفق'}</button>
        </p>
      ))}
    </Page>
  );
}

function TeamPage() {
  const [query, setQuery] = useState({ q: '', role: 'all' });
  const { data, error, reload } = useLoad(() => api(`/team?q=${encodeURIComponent(query.q)}&role=${query.role}`), [query.q, query.role]);
  if (error) return <Page title="کاربران"><p>{error}</p></Page>;
  if (!data) return <SkeletonRows />;
  return (
    <Page title="کاربران و ناوگان">
      <div className="form-grid" style={{ marginBottom: 12 }}>
        <input className="field" placeholder="نام، موبایل، یا پلاک" value={query.q} onChange={(e) => setQuery({ ...query, q: e.target.value })} />
        <select className="select" value={query.role} onChange={(e) => setQuery({ ...query, role: e.target.value })}>
          <option value="all">همه نقش‌ها</option>
          <option value="driver">راننده</option>
          <option value="owner">صاحب بار</option>
          <option value="inspector">متصدی</option>
        </select>
      </div>
      <div className="card table-wrap">
        <table className="data">
          <thead><tr><th>نام</th><th>نقش</th><th>شماره</th><th>خودرو / شرکت</th><th>حساب</th><th></th></tr></thead>
          <tbody>
            {data.map((person) => (
              <tr key={`${person.role}-${person.id}`}>
                <td>{person.role === 'driver' ? <Link to={`/admin/drivers/${person.id}`}>{person.name}</Link> : person.name}</td>
                <td>{person.role === 'driver' ? 'راننده' : person.role === 'owner' ? 'صاحب بار' : 'متصدی'}</td>
                <td>{person.phone}</td>
                <td>{person.plate || person.company || '—'}</td>
                <td>{person.accountVerified ? 'تأیید شده' : 'لغو تأیید'}</td>
                <td>{person.role === 'driver' && (
                  <button type="button" className="btn secondary" onClick={async () => {
                    try {
                      await api(`/team/drivers/${person.id}/account`, { method: 'POST', body: { verified: !person.accountVerified } });
                      reload();
                    } catch (err) { toast.error(err.message); }
                  }}>{person.accountVerified ? 'لغو تأیید' : 'تأیید حساب'}</button>
                )}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Page>
  );
}

function ControlPage() {
  const { data, error } = useLoad(() => api('/control-room'), []);
  if (error) return <Page title="اتاق کنترل"><p>{error}</p></Page>;
  if (!data) return <SkeletonRows />;
  const cards = [
    ['بدون موقعیت', data.movingWithoutLocation.length],
    ['ایمیل در صف', data.emailPending],
    ['ایمیل ناموفق', data.emailFailed],
    ['پرونده منتظر', data.pendingDrivers],
    ['مدارک منقضی', data.expiredDrivers],
    ['بار در انتظار بررسی', data.pendingReview],
    ['بدون راننده', data.unassigned],
    ['بارگیری عقب‌افتاده', data.latePickups.length],
    ['رخداد باز', data.openIncidents],
    ['پیگیری عقب‌افتاده', data.overdueFollowups],
  ];
  return (
    <Page title="اتاق کنترل عملیات">
      <div className="stat-grid">
        {cards.map(([label, value]) => (
          <article key={label} className="card" style={{ padding: 14 }}><div className="muted">{label}</div><strong>{Number(value).toLocaleString('fa-IR')}</strong></article>
        ))}
      </div>
      <h2>مراحل سرنخ</h2>
      <p>{Object.entries(data.leadStages).map(([key, count]) => `${STAGE_LABEL[key] || key}: ${count}`).join(' · ')}</p>
      <h2>در مسیر، بدون موقعیت</h2>
      {data.movingWithoutLocation.map((row) => <p key={row.id}><Link to={`/admin/orders/${row.id}`}>{row.trackingCode}</Link> {row.origin} به {row.destination}</p>)}
      <h2>تاریخ بارگیری گذشته</h2>
      {data.latePickups.map((row) => <p key={row.id}><Link to={`/admin/orders/${row.id}`}>{row.trackingCode}</Link> {row.loadingDate} — {row.status}</p>)}
      <h2>صف پرونده راننده</h2>
      {data.driverQueue.map((row) => <p key={row.id}><Link to={`/admin/drivers/${row.id}`}>{row.name}</Link> — {row.status === 'rejected' ? 'نیازمند اصلاح' : 'در انتظار بررسی'}</p>)}
      <p><Link to="/admin/map">نقشه ناوگان</Link></p>
    </Page>
  );
}

const PAGES = {
  crm: CrmPage,
  articles: ArticlesPage,
  incidents: IncidentsPage,
  finance: FinancePage,
  tickets: TicketsPage,
  notifications: NoticesPage,
  contacts: ContactsPage,
  team: TeamPage,
  control: ControlPage,
};

export default function DeskPages({ page }) {
  const View = PAGES[page] || ControlPage;
  return <View />;
}
