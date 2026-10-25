import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowRight, XCircle, Star, PackageCheck } from 'lucide-react';
import { getShipmentById, respondToPrice, cancelShipment, confirmDelivery } from '../../api/shipment.api';
import StatusBadge from '../../components/common/StatusBadge';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import RatingModal from '../../components/shipment/RatingModal';
import { formatToman } from '../../utils/currency.util';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../utils/errorMessage';
import ShipmentChat from '../../../../shared/components/ShipmentChat';

const CANCELLABLE = ['pending_review', 'price_proposed', 'searching_driver'];
const RATEABLE = ['completed'];

export default function ShipmentDetail() {
  const { id } = useParams();
  const [shipment, setShipment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [ratingOpen, setRatingOpen] = useState(false);
  const toast = useToast();

  const load = () => {
    setLoading(true);
    getShipmentById(id).then(setShipment).finally(() => setLoading(false));
  };

  useEffect(load, [id]);

  const handleRespond = async (action) => {
    setBusy(true);
    try {
      await respondToPrice(id, action);
      toast.success(action === 'accept' ? 'قیمت تأیید شد.' : 'درخواست رد شد و بار لغو شد.');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err, 'خطا در ثبت پاسخ'));
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async () => {
    setBusy(true);
    try {
      await cancelShipment(id, cancelReason);
      toast.success('بار با موفقیت لغو شد.');
      setCancelOpen(false);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err, 'خطا در لغو بار'));
    } finally {
      setBusy(false);
    }
  };

  const handleConfirmDelivery = async () => {
    setBusy(true);
    try {
      await confirmDelivery(id);
      toast.success('تحویل بار تأیید شد.');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err, 'خطا در تأیید تحویل'));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <p className="text-sm text-ink-300">در حال بارگذاری...</p>;
  if (!shipment) return <p className="text-sm text-ink-300">بار مورد نظر یافت نشد.</p>;

  return (
    <div className="mx-auto w-full max-w-4xl">
      <ShipmentChat
        shipmentId={shipment.id}
        token={localStorage.getItem('token')}
        enabled
        mine="owner"
        channel="owner_operator"
      />
      <Link to="/owner/shipments" className="mb-4 inline-flex items-center gap-1 text-sm text-ink-300 hover:text-ink-700">
        <ArrowRight size={15} />
        بازگشت به فهرست بارها
      </Link>

      <div className="rounded-xl border border-ink-100 bg-white p-6 shadow-panel">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="tabular text-lg font-bold text-ink-900">{shipment.tracking_code}</p>
            <p className="mt-1 text-xs text-ink-300">
              {shipment.originCity?.name} ← {shipment.destCity?.name}
            </p>
          </div>
          <StatusBadge status={shipment.status} />
        </div>

        <dl className="grid grid-cols-1 gap-y-3 text-sm sm:grid-cols-2">
          <dt className="text-ink-300">وزن</dt>
          <dd className="tabular text-left text-ink-900">{shipment.weight_kg} kg</dd>
          <dt className="text-ink-300">قیمت پیشنهادی شما</dt>
          <dd className="tabular text-left text-ink-900">{formatToman(shipment.proposed_price)} تومان</dd>
          {shipment.operator_price && (
            <>
              <dt className="text-ink-300">قیمت نهایی اپراتور</dt>
              <dd className="tabular text-left font-bold text-ink-900">{formatToman(shipment.operator_price)} تومان</dd>
            </>
          )}
          <dt className="text-ink-300">تاریخ بارگیری</dt>
          <dd className="tabular text-left text-ink-900">
            {new Intl.DateTimeFormat('fa-IR').format(new Date(shipment.loading_date))}
          </dd>
        </dl>

        {shipment.price_status === 'proposed' && (
          <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="mb-3 text-sm text-amber-800">
              اپراتور مبلغ {formatToman(shipment.operator_price)} تومان را برای این بار پیشنهاد داده. آیا تأیید می‌کنید؟
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="accent" size="sm" loading={busy} onClick={() => handleRespond('accept')}>
                تأیید می‌کنم
              </Button>
              <Button variant="danger" size="sm" loading={busy} onClick={() => handleRespond('reject')}>
                رد می‌کنم
              </Button>
            </div>
          </div>
        )}

        {CANCELLABLE.includes(shipment.status) && (
          <div className="mt-5 border-t border-ink-50 pt-5">
            <Button variant="danger" size="sm" icon={XCircle} onClick={() => setCancelOpen(true)}>
              لغو این بار
            </Button>
          </div>
        )}

        {shipment.cancel_reason && (
          <p className="mt-4 rounded-lg bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
            دلیل لغو: {shipment.cancel_reason}
          </p>
        )}

        {shipment.status === 'delivered' && (
          <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <p className="mb-3 text-sm text-emerald-800">
              راننده اعلام کرده بار به مقصد رسیده. آیا دریافت کالا را تأیید می‌کنید؟
            </p>
            <Button variant="accent" size="sm" icon={PackageCheck} loading={busy} onClick={handleConfirmDelivery}>
              بله، بار را تحویل گرفتم
            </Button>
          </div>
        )}

        {RATEABLE.includes(shipment.status) && (
          <div className="mt-5 border-t border-ink-50 pt-5">
            {shipment.rating ? (
              <p className="flex items-center gap-1.5 text-sm text-ink-500">
                <Star size={15} className="fill-amber-500 text-amber-500" />
                به این مأموریت امتیاز داده‌اید. ممنون از بازخوردتون!
              </p>
            ) : (
              <Button variant="accent" size="sm" icon={Star} onClick={() => setRatingOpen(true)}>
                امتیازدهی به این مأموریت
              </Button>
            )}
          </div>
        )}
      </div>

      <RatingModal
        open={ratingOpen}
        onClose={() => setRatingOpen(false)}
        shipmentId={id}
        onRated={load}
      />

      <Modal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="لغو بار"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCancelOpen(false)}>انصراف</Button>
            <Button variant="danger" loading={busy} onClick={handleCancel} disabled={cancelReason.trim().length < 5}>
              تأیید لغو
            </Button>
          </>
        }
      >
        <textarea
          className="w-full rounded-lg border border-ink-100 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40"
          rows={3}
          placeholder="دلیل لغو را بنویسید..."
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
        />
        <p className="mt-1.5 text-xs text-ink-300">حداقل ۵ کاراکتر بنویسید.</p>
      </Modal>
    </div>
  );
}
