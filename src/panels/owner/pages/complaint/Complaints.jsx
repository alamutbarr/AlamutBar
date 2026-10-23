import { useEffect, useState } from 'react';
import { ShieldAlert, Send, Paperclip, X, Loader2 } from 'lucide-react';
import { createComplaint, getMyComplaints } from '../../api/complaint.api';
import { getMyShipments } from '../../api/shipment.api';
import { uploadComplaintEvidence } from '../../api/upload.api';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../utils/errorMessage';

const TYPE_LABELS = {
  driver: 'راننده',
  dispatcher: 'متصدی',
  cargo: 'آسیب به کالا',
  delay: 'تأخیر در حمل',
  other: 'سایر موارد',
};

const STATUS_LABELS = {
  pending: { label: 'در بررسی', tone: 'bg-amber-50 text-amber-700' },
  reviewed: { label: 'بررسی شد', tone: 'bg-blue-50 text-blue-700' },
  resolved: { label: 'حل شد', tone: 'bg-emerald-50 text-emerald-700' },
  rejected: { label: 'رد شد', tone: 'bg-red-50 text-red-700' },
};

export default function Complaints() {
  const [complaints, setComplaints] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [form, setForm] = useState({ type: '', shipment_id: '', description: '' });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [error, setError] = useState('');
  const toast = useToast();

  const load = () => {
    Promise.all([getMyComplaints(), getMyShipments()])
      .then(([c, s]) => {
        setComplaints(c);
        setShipments(s);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadComplaintEvidence(file);
      setEvidenceUrl(url);
    } catch (err) {
      toast.error(getErrorMessage(err, 'بارگذاری مدرک با خطا مواجه شد.'));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await createComplaint({ ...form, shipment_id: form.shipment_id || null, evidence_url: evidenceUrl || null });
      toast.success('شکایت شما با موفقیت ثبت شد.');
      setForm({ type: '', shipment_id: '', description: '' });
      setEvidenceUrl('');
      load();
    } catch (err) {
      setError(getErrorMessage(err, 'ثبت شکایت با خطا مواجه شد.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-ink-900">ثبت شکایت</h1>
        <p className="mt-1 text-sm text-ink-300">گزارش تخلف، تأخیر یا هر مشکل دیگر در روند حمل</p>
      </div>

      <div className="mb-8 rounded-xl border border-ink-100 bg-white p-6 shadow-panel">
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              as="select"
              label="موضوع شکایت"
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              required
            >
              <option value="">انتخاب کنید</option>
              {Object.entries(TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Input>
            <Input
              as="select"
              label="بار مرتبط (اختیاری)"
              value={form.shipment_id}
              onChange={(e) => setForm((f) => ({ ...f, shipment_id: e.target.value }))}
            >
              <option value="">بدون ارتباط با بار خاص</option>
              {shipments.map((s) => (
                <option key={s.id} value={s.id}>{s.tracking_code}</option>
              ))}
            </Input>
          </div>
          <Input
            as="textarea"
            rows={4}
            label="توضیحات"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="جزئیات شکایت را بنویسید..."
            required
          />

          <div>
            <span className="mb-1.5 block text-sm font-medium text-ink-700">مدرک (اختیاری)</span>
            {evidenceUrl ? (
              <div className="flex items-center gap-2 rounded-lg border border-ink-100 bg-ink-50 px-3 py-2 text-xs text-ink-600">
                <Paperclip size={14} />
                <span className="flex-1 truncate">مدرک بارگذاری شد</span>
                <button type="button" onClick={() => setEvidenceUrl('')} className="text-ink-300 hover:text-red-600">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <label className="flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-dashed border-ink-200 px-3.5 py-2 text-xs text-ink-400 transition-colors hover:border-amber-400 hover:text-amber-600">
                {uploading ? <Loader2 size={14} className="animate-spin" /> : <Paperclip size={14} />}
                افزودن فایل یا عکس
                <input type="file" accept="image/*" hidden onChange={handleFileChange} disabled={uploading} />
              </label>
            )}
          </div>

          <Button type="submit" variant="accent" icon={Send} loading={submitting}>
            ثبت شکایت
          </Button>
        </form>
      </div>

      <div className="overflow-hidden rounded-xl border border-ink-100 bg-white shadow-panel">
        <div className="border-b border-ink-50 px-5 py-4">
          <h2 className="text-sm font-bold text-ink-900">شکایت‌های قبلی</h2>
        </div>
        {loading ? (
          <p className="px-5 py-10 text-center text-sm text-ink-300">در حال بارگذاری...</p>
        ) : complaints.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-5 py-14 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-50 text-ink-300">
              <ShieldAlert size={22} />
            </span>
            <p className="text-sm text-ink-400">هنوز شکایتی ثبت نکردی</p>
          </div>
        ) : (
          <ul className="divide-y divide-ink-50">
            {complaints.map((c) => (
              <li key={c.id} className="px-5 py-4">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-sm font-medium text-ink-900">{TYPE_LABELS[c.type]}</span>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_LABELS[c.status].tone}`}>
                    {STATUS_LABELS[c.status].label}
                  </span>
                </div>
                <p className="text-xs text-ink-400">{c.description}</p>
                {c.admin_response && (
                  <p className="mt-2 rounded-lg bg-ink-50 px-3 py-2 text-xs text-ink-600">
                    پاسخ: {c.admin_response}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
