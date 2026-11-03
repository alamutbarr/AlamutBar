import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '../api';
import { useAdmin } from '../auth';
import { WORKFLOW_LABELS, money, when } from '../format';
import { Badge, Page, SkeletonRows } from '../components/ui';
import OwnerDocuments, { ID_TYPE_LABELS, hasPendingOwnerDocuments } from '../components/OwnerDocuments';

const VERIFICATION_LABELS = {
  VERIFIED: 'مدارک تأیید شده',
  REJECTED: 'مدرک رد شده',
  PENDING: 'در انتظار تأیید مدارک',
};

const VERIFICATION_TONE = {
  VERIFIED: 'ok',
  REJECTED: 'crit',
  PENDING: 'warn',
};

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #eef2f0' }}>
      <span className="muted">{label}</span>
      <strong style={{ fontWeight: 500 }}>{children || '—'}</strong>
    </div>
  );
}

function dims(item) {
  const parts = [item.lengthCm, item.widthCm, item.heightCm].map((value) => (value ? value : null));
  if (parts.every((value) => value == null)) return null;
  return `${parts.map((value) => (value == null ? '—' : (value / 100).toLocaleString('fa-IR', { maximumFractionDigits: 2 }))).join(' × ')} متر`;
}

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

  const canReview = can('owners.documents');
  const stats = customer.stats || {};
  const user = customer.user || null;

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
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              <Badge tone={VERIFICATION_TONE[customer.verificationStatus] || 'warn'}>
                {VERIFICATION_LABELS[customer.verificationStatus] || 'در انتظار تأیید مدارک'}
              </Badge>
              {hasPendingOwnerDocuments(customer) && <Badge tone="warn">مدرک در انتظار بررسی</Badge>}
              {customer.requireInspector && <Badge tone="idle">الزام متصدی</Badge>}
            </div>
            <h2 style={{ margin: '0 0 8px' }}>اطلاعات مشتری</h2>
            <Field label="نام">{(customer.firstName || '') + ' ' + (customer.lastName || '')}</Field>
            <Field label="شرکت">{customer.companyName}</Field>
            <Field label="کد ملی">{customer.nationalId}</Field>
            <Field label="موبایل">{customer.phone}</Field>
            <Field label="کد پستی">{customer.postalCode}</Field>
            <Field label="سقف قیمت اعلامی">{customer.priceCeiling != null ? money(customer.priceCeiling) : null}</Field>
            <Field label="نوع شناسایی">{ID_TYPE_LABELS[customer.kyc?.idType] || 'انتخاب نشده'}</Field>
            <Field label="وضعیت مدارک">{VERIFICATION_LABELS[customer.verificationStatus] || 'در انتظار تأیید مدارک'}</Field>
            <Field label="ثبت پرونده">{when(customer.createdAt)}</Field>
            <Field label="آخرین ویرایش">{when(customer.updatedAt)}</Field>
            {customer.verificationNote && <p>یادداشت بررسی: {customer.verificationNote}</p>}
            {canReview && (
              <button type="button" className="btn secondary" style={{ marginTop: 8 }} onClick={toggleInspector}>
                {customer.requireInspector ? 'حذف الزام متصدی' : 'الزام متصدی'}
              </button>
            )}
          </article>

          <article className="card" style={{ padding: 16 }}>
            <h2 style={{ marginTop: 0 }}>مدارک هویتی</h2>
            <p className="muted">هر تصویر را جدا ببینید و همان‌جا تأیید یا با دلیل رد کنید.</p>
            <OwnerDocuments owner={customer} canReview={canReview} onReviewed={load} />
          </article>
        </div>

        <div style={{ display: 'grid', gap: 12, alignContent: 'start' }}>
          <article className="card" style={{ padding: 16 }}>
            <h3 style={{ marginTop: 0 }}>حساب کاربری</h3>
            {user ? (
              <>
                <Field label="شناسه کاربر">{user.id?.toLocaleString('fa-IR')}</Field>
                <Field label="نقش">{user.role || '—'}</Field>
                <Field label="موبایل حساب">{user.phone}</Field>
                <Field label="موبایل تأییدشده">{user.phoneVerified ? 'بله' : 'خیر'}</Field>
                <Field label="وضعیت حساب">{user.isActive ? 'فعال' : 'غیرفعال'}</Field>
                <Field label="امتیاز">{(user.ratingAvg || 0).toLocaleString('fa-IR')}</Field>
                <Field label="ساخت حساب">{when(user.createdAt)}</Field>
              </>
            ) : <p className="muted">حساب کاربری متصل نیست.</p>}
          </article>

          <article className="card" style={{ padding: 16 }}>
            <h3 style={{ marginTop: 0 }}>آمار بارها</h3>
            <Field label="کل بارها">{(stats.total || 0).toLocaleString('fa-IR')}</Field>
            <Field label="در جریان">{(stats.active || 0).toLocaleString('fa-IR')}</Field>
            <Field label="تکمیل‌شده">{(stats.completed || 0).toLocaleString('fa-IR')}</Field>
            <Field label="لغو‌شده">{(stats.cancelled || 0).toLocaleString('fa-IR')}</Field>
            <Field label="مجموع کرایه">{money(stats.freight || 0)}</Field>
          </article>

          <article className="card" style={{ padding: 16 }}>
            <h3 style={{ marginTop: 0 }}>بارهای اخیر</h3>
            {(customer.shipments || []).map((shipment) => (
              <div key={shipment.id} style={{ padding: '8px 0', borderBottom: '1px solid #eef2f0' }}>
                <button type="button" className="nav-link" onClick={() => navigate(`/admin/orders/${shipment.id}`)}>
                  {shipment.trackingCode} — {WORKFLOW_LABELS[shipment.workflowStatus] || shipment.workflowStatus || '—'}
                </button>
                <div className="muted" style={{ fontSize: 12 }}>
                  {[shipment.originCity, shipment.destCity].filter(Boolean).join(' ← ') || 'مسیر ثبت نشده'}
                  {shipment.cargoType ? ` · ${shipment.cargoTypeOther || shipment.cargoType}` : ''}
                  {shipment.weightKg ? ` · ${shipment.weightKg.toLocaleString('fa-IR')} کیلوگرم` : ''}
                  {dims(shipment) ? ` · ${dims(shipment)}` : ''}
                </div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {shipment.finalPrice != null ? `کرایه نهایی ${money(shipment.finalPrice)}` : `پیشنهاد ${money(shipment.proposedPrice)}`}
                  {shipment.penaltyAmount ? ` · جریمه ${money(shipment.penaltyAmount)}` : ''}
                  {shipment.waybillNumber ? ` · بارنامه ${shipment.waybillNumber}` : ''}
                  {shipment.loadingDate ? ` · بارگیری ${shipment.loadingDate}` : ''}
                </div>
              </div>
            ))}
            {!(customer.shipments || []).length && <p className="muted">باری برای این مشتری ثبت نشده است.</p>}
          </article>
        </div>
      </div>
    </Page>
  );
}
