import { useState } from 'react';
import { toast } from 'sonner';
import { api } from '../api';
import { Badge } from './ui';

const GROUPS = [
  ['personal', 'مدارک فردی'],
  ['vehicle', 'مدارک ناوگان'],
  ['insurance', 'بیمه'],
];

const STATUS = { PENDING: 'در انتظار بررسی', APPROVED: 'تأیید شد', REJECTED: 'رد شد' };

export function flattenDriverDocuments(driver) {
  return GROUPS.flatMap(([group, groupTitle]) => (
    (driver?.documents?.[group] || []).map((doc, index) => ({ ...doc, group, groupTitle, index }))
  ));
}

export function hasPendingDriverDocuments(driver) {
  return flattenDriverDocuments(driver).some((doc) => doc.url && doc.status === 'PENDING');
}

export default function DriverDocuments({ driver, canReview, onReviewed }) {
  const [reasons, setReasons] = useState({});

  async function review(group, index, decision) {
    const key = `${group}:${index}`;
    try {
      await api(`/drivers/${driver.id}/documents/review`, {
        method: 'POST',
        body: { group, index, decision, reason: reasons[key] || '' },
      });
      toast.success(decision === 'APPROVED' ? 'مدرک تأیید شد' : 'دلیل رد برای راننده ارسال شد');
      onReviewed?.();
    } catch (error) {
      toast.error(error.message);
    }
  }

  return (
    <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
      {GROUPS.map(([group, title]) => {
        const docs = driver.documents?.[group] || [];
        return (
          <div key={group}>
            <h3 style={{ margin: '0 0 8px' }}>{title}</h3>
            {docs.map((doc, index) => {
              const key = `${group}:${index}`;
              return (
                <div key={`${doc.key}-${index}`} style={{ border: '1px solid #d8e1dc', borderRadius: 8, padding: 10, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                    <strong>{doc.title}</strong>
                    <Badge tone={doc.status === 'APPROVED' ? 'ok' : doc.status === 'REJECTED' ? 'crit' : 'warn'}>
                      {STATUS[doc.status] || doc.status}
                    </Badge>
                  </div>
                  {doc.url ? (
                    <a href={doc.url} target="_blank" rel="noreferrer">
                      <img src={doc.url} alt={doc.title} style={{ display: 'block', marginTop: 8, maxWidth: 240, maxHeight: 160, objectFit: 'contain', background: '#f7f6f0' }} />
                    </a>
                  ) : <p className="muted">ارسال نشده</p>}
                  {doc.note && <p>دلیل رد: {doc.note}</p>}
                  {canReview && doc.url && doc.status === 'PENDING' && (
                    <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                      <button type="button" className="btn" onClick={() => review(group, index, 'APPROVED')}>تأیید این مدرک</button>
                      <textarea
                        className="area"
                        placeholder="دلیل رد این مدرک"
                        value={reasons[key] || ''}
                        onChange={(event) => setReasons((current) => ({ ...current, [key]: event.target.value }))}
                      />
                      <button type="button" className="btn secondary" onClick={() => review(group, index, 'REJECTED')}>ارسال دلیل رد</button>
                    </div>
                  )}
                  {doc.status === 'APPROVED' && (
                    <p className="muted" style={{ marginBottom: 0 }}>این تصویر تأیید شده و دیگر از پنل راننده قابل تغییر نیست.</p>
                  )}
                </div>
              );
            })}
            {docs.length === 0 && <p className="muted">مدرکی بارگذاری نشده.</p>}
          </div>
        );
      })}
    </div>
  );
}
