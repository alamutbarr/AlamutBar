import { useState } from 'react';
import { Star } from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { rateShipment } from '../../api/rating.api';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../utils/errorMessage';

function StarPicker({ value, onChange }) {
  return (
    <div className="flex gap-1" dir="ltr">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => onChange(n)} className="text-amber-500">
          <Star size={26} fill={n <= value ? 'currentColor' : 'none'} strokeWidth={1.5} />
        </button>
      ))}
    </div>
  );
}

export default function RatingModal({ open, onClose, shipmentId, onRated }) {
  const [driverScore, setDriverScore] = useState(0);
  const [dispatcherScore, setDispatcherScore] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await rateShipment(shipmentId, {
        driver_score: driverScore || null,
        dispatcher_score: dispatcherScore || null,
        comment: comment || null,
      });
      toast.success('امتیاز شما با موفقیت ثبت شد.');
      onRated();
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err, 'ثبت امتیاز با خطا مواجه شد.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="امتیازدهی به این مأموریت"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>بعداً</Button>
          <Button variant="accent" loading={loading} onClick={handleSubmit} disabled={!driverScore}>
            ثبت امتیاز
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <p className="mb-1.5 text-sm font-medium text-ink-700">امتیاز راننده</p>
          <StarPicker value={driverScore} onChange={setDriverScore} />
        </div>
        <div>
          <p className="mb-1.5 text-sm font-medium text-ink-700">امتیاز متصدی (اختیاری)</p>
          <StarPicker value={dispatcherScore} onChange={setDispatcherScore} />
        </div>
        <textarea
          className="w-full rounded-lg border border-ink-100 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40"
          rows={3}
          placeholder="نظر شما (اختیاری)..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </div>
    </Modal>
  );
}
