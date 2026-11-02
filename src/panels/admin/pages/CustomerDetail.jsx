import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '../api';
import { useAdmin } from '../auth';
import { WORKFLOW_LABELS, money, when } from '../format';
import { Badge, Page, SkeletonRows } from '../components/ui';
import OwnerDocuments, { hasPendingOwnerDocuments } from '../components/OwnerDocuments';

const VERIFICATION_LABELS = {
  VERIFIED: 'همه مدارک تأیید شد',
  REJECTED: 'مدرکی رد شده',
  PENDING: 'در انتظار تکمیل مدارک',
};

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { can } = useAdmin();
  const [customer, setCustomer] = useState(null);

  const load = () => api(`/customers/${id}`).then(setCustomer);

  useEffect(() => {
    load().catch((error) => toast.error(error.message));
  }, [id]);

  if (!customer) return <SkeletonRows />;

  async function toggleInspector() {
    try {
      await api(`/customers/${id}`, { method: 'PATCH', body: { requireInspector: !customer.requireInspector } });
      toast.success('پرونده مشتری به‌روز شد');
      load();
    } catch (error) {
      toast.error(error.message);
    }
  }

  return (
    <Page
      title={customer.companyName || customer.fullName}
      action={<button type="button" className="btn secondary" onClick={() => navigate('/admin/customers')}>بازگشت</button>}
    >
      <div className="split">
        <div style={{ display: 'grid', gap: 12 }}>
          <article className="card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Badge tone={customer.verificationStatus === 'VERIFIED' ? 'ok' : customer.verificationStatus === 'REJECTED' ? 'crit' : 'warn'}>
                {VERIFICATION_LABELS[customer.verificationStatus] || 'در انتظار تکمیل مدارک'}
              </Badge>
              {hasPendingOwnerDocuments(customer) && <Badge tone="warn">مدرک در انتظار بررسی</Badge>}
            </div>
            <p>نام: {customer.fullName || '—'}</p>
            <p>شرکت: {customer.companyName || '—'}</p>
            <p>موبایل: {customer.phone || '—'}</p>
            <p>کد ملی: {customer.nationalId || '—'}</p>
            <p>کد پستی: {customer.postalCode || '—'}</p>
            <p>سقف قیمت: {money(customer.priceCeiling)}</p>
            <p>الزام متصدی: {customer.requireInspector ? 'بله' : 'خیر'}</p>
            <p className="muted">تاریخ ثبت: {customer.createdAt ? when(customer.createdAt) : '—'}</p>
            {customer.verificationNote && <p>یادداشت بررسی: {customer.verificationNote}</p>}
            {can('owners.documents') && (
              <button type="button" className="btn secondary" onClick={toggleInspector}>
                {customer.requireInspector ? 'حذف الزام متصدی' : 'الزام متصدی'}
              </button>
            )}
          </article>
          <article className="card" style={{ padding: 16 }}>
            <h2 style={{ marginTop: 0 }}>تأیید مدارک مشتری</h2>
            <p className="muted">همان روند رانندگان: هر عکس جدا تأیید یا با دلیل رد می‌شود.</p>
            <OwnerDocuments owner={customer} canReview={can('owners.documents')} onReviewed={load} />
          </article>
        </div>
        <div style={{ display: 'grid', gap: 12, alignContent: 'start' }}>
          <article className="card" style={{ padding: 16 }}>
            <h3 style={{ marginTop: 0 }}>بارهای اخیر</h3>
            {(customer.shipments || []).map((shipment) => (
              <button key={shipment.id} type="button" className="nav-link" onClick={() => navigate(`/admin/orders/${shipment.id}`)}>
                {shipment.trackingCode} — {WORKFLOW_LABELS[shipment.workflowStatus] || shipment.workflowStatus || '—'}
              </button>
            ))}
            {!(customer.shipments || []).length && <p className="muted">باری برای این مشتری ثبت نشده است.</p>}
          </article>
        </div>
      </div>
    </Page>
  );
}
