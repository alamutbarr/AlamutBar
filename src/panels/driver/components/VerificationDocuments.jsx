import { useEffect, useMemo, useState } from 'react';
import {
  Upload, Loader2, CheckCircle2, ShieldCheck, ShieldAlert, AlertTriangle, Send,
} from 'lucide-react';
import { VERIFICATION_SECTIONS } from '@/verification';
import { api } from '@/services/api';

const STATUS_LABEL = {
  PENDING: 'در صف بررسی',
  APPROVED: 'تأیید شد',
  REJECTED: 'رد شد',
};

export function VerificationDocuments({ driverId, onVerifiedChange, onDriverUpdate }) {
  const [serverDocs, setServerDocs] = useState([]);
  const [notices, setNotices] = useState([]);
  const [pending, setPending] = useState({});
  const [previews, setPreviews] = useState({});
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  const refresh = async () => {
    const res = await api.get('/driver/profile');
    const driver = res.data?.driver;
    setServerDocs(Array.isArray(driver?.documents) ? driver.documents : []);
    setNotices(Array.isArray(driver?.notices) ? driver.notices : []);
    onDriverUpdate?.(driver);
    if (driver?.notices?.some((item) => !item.isRead)) {
      api.post('/driver/notices/read').catch(() => {});
    }
    return driver;
  };

  useEffect(() => {
    let cancelled = false;
    refresh().catch((err) => {
      if (!cancelled) setError(err.response?.data?.message || 'دریافت مدارک ناموفق بود.');
    });
    return () => { cancelled = true; };
  }, [driverId]);

  const byKey = useMemo(() => {
    const map = new Map();
    serverDocs.forEach((doc) => map.set(doc.key, doc));
    return map;
  }, [serverDocs]);

  useEffect(() => {
    const mandatoryDone = VERIFICATION_SECTIONS.filter((section) => section.mandatory).every((section) => (
      section.slots.every((slot) => {
        const doc = byKey.get(`${section.id}:${slot.id}`);
        return doc?.url && doc.status !== 'REJECTED';
      })
    ));
    onVerifiedChange?.(mandatoryDone);
  }, [byKey, onVerifiedChange]);

  const chooseFile = (section, slot, event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('فقط تصویر مجاز است.');
      return;
    }
    const key = `${section.id}:${slot.id}`;
    setPending((current) => ({ ...current, [key]: file }));
    setPreviews((current) => {
      if (current[key]) URL.revokeObjectURL(current[key]);
      return { ...current, [key]: URL.createObjectURL(file) };
    });
    setStatus('فایل انتخاب شد. برای ارسال، دکمه تأیید و ارسال مدارک را بزنید.');
    setError('');
  };

  const submit = async () => {
    const entries = Object.entries(pending);
    if (!entries.length) {
      setError('اول فایل مدارک را انتخاب کنید.');
      return;
    }
    const form = new FormData();
    entries.forEach(([key, file]) => {
      form.append('files', file);
      form.append('slots', key);
    });
    setSending(true);
    setError('');
    setStatus('در حال ارسال مدارک...');
    try {
      const res = await api.post('/driver/documents', form, {
        headers: { 'Content-Type': undefined },
        transformRequest: [(data, headers) => {
          delete headers['Content-Type'];
          return data;
        }],
      });
      setPending({});
      setServerDocs(res.data?.driver?.documents || []);
      setNotices(res.data?.driver?.notices || []);
      onDriverUpdate?.(res.data?.driver);
      setStatus(res.data?.message || 'مدارک ارسال شد.');
    } catch (err) {
      setStatus('');
      setError(err.response?.data?.message || 'ارسال مدارک ناموفق بود.');
    } finally {
      setSending(false);
    }
  };

  const pendingCount = Object.keys(pending).length;

  return (
    <div className="space-y-3">
      {notices.filter((item) => item.title === 'مدرک رد شد' || !item.isRead).slice(0, 4).map((notice) => (
        <div key={notice.id} className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs leading-6 text-rose-700">
          <strong className="block">{notice.title}</strong>
          {notice.message}
        </div>
      ))}

      <div className="rounded-md border border-[#d8e1dc] bg-[#f7f6f0] px-3 py-2.5 text-xs text-[#526d70]">
        <div className="flex items-center gap-1.5 font-bold text-[#17383b]">
          {pendingCount ? <ShieldAlert className="h-4 w-4 text-[#d7b56d]" /> : <ShieldCheck className="h-4 w-4 text-[#087f8c]" />}
          بعد از انتخاب فایل‌ها، ارسال را تأیید کنید تا مدارک برای اپراتور برود.
        </div>
        {status && <p className="mt-1 text-[#087f8c]">{status}</p>}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {VERIFICATION_SECTIONS.map((section) => (
        <div key={section.id} className="rounded-md border border-[#d8e1dc] bg-white p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h4 className="text-sm font-bold text-[#17383b]">{section.title}</h4>
            <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${section.mandatory ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-700'}`}>
              {section.mandatory ? 'اجباری' : 'اختیاری'}
            </span>
          </div>
          <p className="mb-3 text-xs leading-6 text-[#526d70]">{section.description}</p>
          <div className={`grid gap-2 ${section.slots.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {section.slots.map((slot) => {
              const key = `${section.id}:${slot.id}`;
              const saved = byKey.get(key);
              const preview = previews[key] || saved?.url;
              const rejected = saved?.status === 'REJECTED';
              return (
                <div key={slot.id}>
                  <input id={key} type="file" accept="image/*" className="hidden" onChange={(event) => chooseFile(section, slot, event)} />
                  <label htmlFor={key} className="flex aspect-[8/5] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-md border border-dashed border-[#d8e1dc] bg-[#f7f6f0] text-[#526d70]">
                    {preview ? (
                      <img src={preview} alt={slot.label} className="h-full w-full object-contain" />
                    ) : (
                      <>
                        <Upload className="mb-1 h-5 w-5" />
                        <span className="px-2 text-center text-[11px]">{slot.label}</span>
                      </>
                    )}
                  </label>
                  <div className="mt-1 text-[11px] leading-5">
                    {pending[key] && <span className="text-[#087f8c]">آماده ارسال</span>}
                    {!pending[key] && saved && (
                      <span className={rejected ? 'text-rose-600' : 'text-[#17383b]'}>
                        {saved.status === 'APPROVED' && <CheckCircle2 className="ml-1 inline h-3.5 w-3.5" />}
                        {STATUS_LABEL[saved.status] || saved.status}
                        {rejected && saved.note ? ` — ${saved.note}` : ''}
                        {rejected ? ' — می‌توانید دوباره بارگذاری کنید.' : ''}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={submit}
        disabled={sending || pendingCount === 0}
        className="flex w-full items-center justify-center gap-2 rounded-md bg-[#087f8c] py-3 text-sm font-bold text-[#f7f6f0] disabled:opacity-50"
      >
        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        تأیید و ارسال مدارک
      </button>
    </div>
  );
}
