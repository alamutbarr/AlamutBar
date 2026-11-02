import { useState } from 'react';
import { toast } from 'sonner';
import { api } from '../api';
import { Badge } from './ui';

const STATUS = { MISSING: 'ارسال نشده', PENDING: 'در انتظار بررسی', APPROVED: 'تأیید شد', REJECTED: 'رد شد' };

export const ID_TYPE_LABELS = {
  shenasnameh: 'شناسنامه',
  national_card: 'کارت ملی',
};

export function ownerDocuments(owner) {
  return Array.isArray(owner?.kyc?.documents) ? owner.kyc.documents : [];
}

export function hasPendingOwnerDocuments(owner) {
  return ownerDocuments(owner).some((doc) => doc.url && doc.status === 'PENDING');
}

export default function OwnerDocuments({ owner, canReview, onReviewed }) {
  const [reasons, setReasons] = useState({});
  const docs = ownerDocuments(owner);
  const idType = owner?.kyc?.idType;

  async function review(key, decision) {
    try {
      await api(`/customers/${owner.id}/kyc/review`, {
        method: 'POST',
        body: { key, decision, note: reasons[key] || '' },
      });
      toast.success(decision === 'APPROVED' ? 'مدرک تأیید شد' : 'دلیل رد برای مشتری ارسال شد');
      onReviewed?.();
    } catch (error) {
      toast.error(error.message);
    }
  }

  if (!docs.length) {
    return (
      <p className="muted" style={{ marginBottom: 0 }}>
        {idType
          ? 'مدرکی برای این مشتری ثبت نشده است.'
          : 'مشتری هنوز نوع مدرک شناسایی (شناسنامه یا کارت ملی) را انتخاب نکرده است.'}
      </p>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
      <p className="muted" style={{ margin: 0 }}>
        نوع شناسایی: {ID_TYPE_LABELS[idType] || 'انتخاب نشده'}
      </p>
      {docs.map((doc) => (
        <div key={doc.key} style={{ border: '1px solid #d8e1dc', borderRadius: 8, padding: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
            <strong>{doc.title}{doc.required ? ' (الزامی)' : ''}</strong>
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
              <button type="button" className="btn" onClick={() => review(doc.key, 'APPROVED')}>تأیید این مدرک</button>
              <textarea
                className="area"
                placeholder="دلیل رد این مدرک"
                value={reasons[doc.key] || ''}
                onChange={(event) => setReasons((current) => ({ ...current, [doc.key]: event.target.value }))}
              />
              <button type="button" className="btn secondary" onClick={() => review(doc.key, 'REJECTED')}>ارسال دلیل رد</button>
            </div>
          )}
          {doc.status === 'APPROVED' && (
            <p className="muted" style={{ marginBottom: 0 }}>این تصویر تأیید شده و دیگر از پنل مشتری قابل تغییر نیست.</p>
          )}
        </div>
      ))}
    </div>
  );
}
