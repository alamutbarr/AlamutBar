import { useEffect, useRef, useState } from 'react';
import { ShieldAlert, Send, ImagePlus, X, Loader2 } from 'lucide-react';
import { createComplaint, getMyComplaints, sendComplaintMessage } from '../../api/complaint.api';
import { getMyShipments } from '../../api/shipment.api';
import { uploadComplaintEvidence } from '../../api/upload.api';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../utils/errorMessage';
import { KYC_MAX_LABEL, kycFileIssue } from '../../utils/kycFile';

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

const MAX_PHOTOS = 10;

const ROLE_LABELS = {
  owner: 'شما',
  operator: 'اپراتور',
};

function complaintPhotos(item) {
  if (Array.isArray(item?.evidence_urls)) return item.evidence_urls.filter(Boolean);
  if (Array.isArray(item?.evidence_url)) return item.evidence_url.filter(Boolean);
  if (typeof item?.evidence_url === 'string' && item.evidence_url) return [item.evidence_url];
  return [];
}

export default function Complaints() {
  const [complaints, setComplaints] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [form, setForm] = useState({ type: '', shipment_id: '', description: '' });
  const [photos, setPhotos] = useState([]);
  const [localPreviews, setLocalPreviews] = useState([]);
  const localPreviewsRef = useRef([]);
  localPreviewsRef.current = localPreviews;
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [threadDrafts, setThreadDrafts] = useState({});
  const [sendingId, setSendingId] = useState(null);
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

  const sendThread = async (id) => {
    const body = (threadDrafts[id] || '').trim();
    if (!body) return;
    setSendingId(id);
    try {
      await sendComplaintMessage(id, body);
      setThreadDrafts((current) => ({ ...current, [id]: '' }));
      toast.success('پیام برای اپراتور ارسال شد.');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err, 'ارسال پیام انجام نشد.'));
    } finally {
      setSendingId(null);
    }
  };

  useEffect(() => () => {
    localPreviewsRef.current.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const handleFiles = async (event) => {
    const remaining = MAX_PHOTOS - photos.length;
    const files = Array.from(event.target.files || []).slice(0, remaining);
    if (!files.length) return;
    const invalid = files.find((file) => kycFileIssue(file));
    if (invalid) {
      toast.error(kycFileIssue(invalid));
      event.target.value = '';
      return;
    }
    const blobs = files.map((file) => URL.createObjectURL(file));
    setLocalPreviews((current) => [...current, ...blobs]);
    setUploading(true);
    try {
      const urls = await uploadComplaintEvidence(files);
      setPhotos((current) => [...current, ...urls].slice(0, MAX_PHOTOS));
    } catch (err) {
      toast.error(getErrorMessage(err, 'بارگذاری مدرک با خطا مواجه شد.'));
    } finally {
      blobs.forEach((url) => URL.revokeObjectURL(url));
      setLocalPreviews((current) => current.filter((url) => !blobs.includes(url)));
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await createComplaint({
        ...form,
        shipment_id: form.shipment_id || null,
        evidence_urls: photos,
      });
      toast.success('شکایت شما با موفقیت ثبت شد.');
      setForm({ type: '', shipment_id: '', description: '' });
      setPhotos([]);
      load();
    } catch (err) {
      setError(getErrorMessage(err, 'ثبت شکایت با خطا مواجه شد.'));
    } finally {
      setSubmitting(false);
    }
  };

  const tiles = [
    ...photos.map((url) => ({ key: url, src: url, uploaded: true })),
    ...localPreviews.map((url) => ({ key: url, src: url, uploaded: false })),
  ];

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
            <span className="mb-1.5 block text-sm font-medium text-ink-700">عکس مدرک (اختیاری)</span>
            <p className="mb-2 text-xs text-ink-300">
              تا {MAX_PHOTOS.toLocaleString('fa-IR')} عکس با پیش‌نمایش. سقف هر عکس {KYC_MAX_LABEL} است.
              {' '}{photos.length.toLocaleString('fa-IR')} از {MAX_PHOTOS.toLocaleString('fa-IR')} عکس
            </p>
            <div className="flex flex-wrap gap-3">
              {tiles.map((tile) => (
                <div key={tile.key} className="group relative h-24 w-24 overflow-hidden rounded-lg border border-ink-100 bg-[#f7f6f0]">
                  <img src={tile.src} alt="پیش‌نمایش مدرک شکایت" className="h-full w-full object-cover" />
                  {tile.uploaded && (
                    <button
                      type="button"
                      onClick={() => setPhotos((current) => current.filter((url) => url !== tile.key))}
                      className="absolute inset-0 flex items-center justify-center bg-ink-950/50 text-white opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
              {photos.length < MAX_PHOTOS && (
                <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-ink-100 text-ink-300 transition-colors hover:border-amber-400 hover:text-amber-600">
                  {uploading ? <Loader2 size={18} className="animate-spin" /> : <ImagePlus size={18} />}
                  <span className="text-[10px]">افزودن</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    hidden
                    disabled={uploading}
                    onChange={handleFiles}
                  />
                </label>
              )}
            </div>
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
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_LABELS[c.status]?.tone || 'bg-ink-50 text-ink-600'}`}>
                    {STATUS_LABELS[c.status]?.label || c.status}
                  </span>
                </div>
                <p className="text-xs text-ink-400">{c.description}</p>
                {complaintPhotos(c).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {complaintPhotos(c).map((url) => (
                      <a key={url} href={url} target="_blank" rel="noreferrer">
                        <img src={url} alt="مدرک شکایت" className="h-16 w-16 rounded-md object-cover bg-[#f7f6f0]" />
                      </a>
                    ))}
                  </div>
                )}
                {c.admin_response && (
                  <p className="mt-2 rounded-lg bg-ink-50 px-3 py-2 text-xs text-ink-600">
                    پاسخ: {c.admin_response}
                  </p>
                )}
                <div className="mt-3 space-y-2">
                  {(c.messages || []).map((message) => (
                    <p key={message.id} className="rounded-lg bg-[#f7f6f0] px-3 py-2 text-xs leading-6 text-[#17383b]">
                      <span className="font-bold">{ROLE_LABELS[message.sender_role] || 'پیام'}: </span>
                      {message.body}
                    </p>
                  ))}
                  <textarea
                    rows={2}
                    value={threadDrafts[c.id] || ''}
                    onChange={(event) => setThreadDrafts((current) => ({ ...current, [c.id]: event.target.value }))}
                    placeholder="ادامهٔ گفتگو با اپراتور"
                    className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    loading={sendingId === c.id}
                    onClick={() => sendThread(c.id)}
                  >
                    ارسال پیام
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
