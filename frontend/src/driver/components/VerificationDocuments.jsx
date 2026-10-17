// frontend/src/driver/components/VerificationDocuments.jsx
//
// بخش مدارک احراز هویت در پروفایل: گواهینامه (اجباری، پشت/رو)، عکس شخصی با
// کارت (اجباری)، کارت ملی (نیمه‌اجباری، پشت/رو) و کارت خودرو (نیمه‌اجباری،
// پشت/رو). هر بخش پس از تکمیل، کاربر را به بخش بعدی راهنمایی می‌کند.

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Upload, Trash2, Loader2, CheckCircle2, ShieldCheck, ShieldAlert,
  ArrowLeft, IdCard, CreditCard, User, Car, AlertTriangle,
} from 'lucide-react';
import {
  VERIFICATION_SECTIONS,
  readVerification,
  saveVerificationPhoto,
  removeVerificationPhoto,
  sectionStatus,
  isVerificationComplete,
  fileToDocumentPhoto,
} from '@/driver/verification';

const SECTION_ICONS = {
  driverLicense: IdCard,
  selfie: User,
  nationalCard: CreditCard,
  vehicleCard: Car,
};

export function VerificationDocuments({ driverId, onVerifiedChange }) {
  const [docs, setDocs] = useState(() => readVerification(driverId));
  const [busySlot, setBusySlot] = useState(null); // `${sectionId}:${slotId}`
  const [error, setError] = useState('');
  const sectionRefs = useRef({});

  const verified = isVerificationComplete(driverId);

  // اطلاع‌رسانی وضعیت تکمیل به والد (برای به‌روزرسانی نشان «احراز هویت شده»)
  useEffect(() => {
    onVerifiedChange?.(verified);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verified, docs]);

  useEffect(() => {
    setDocs(readVerification(driverId));
    setError('');
  }, [driverId]);

  const reload = useCallback(() => setDocs(readVerification(driverId)), [driverId]);

  const scrollToSection = (id) => {
    sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleFile = async (section, slot, event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const slotKey = `${section.id}:${slot.id}`;
    setBusySlot(slotKey);
    setError('');
    try {
      const dataUrl = await fileToDocumentPhoto(file);
      saveVerificationPhoto(driverId, section.id, slot.id, dataUrl);
      reload();
    } catch (err) {
      setError(err?.message || 'بارگذاری عکس ناموفق بود.');
    } finally {
      setBusySlot(null);
    }
  };

  const handleRemove = (section, slot) => {
    removeVerificationPhoto(driverId, section.id, slot.id);
    reload();
  };

  // اولین بخشِ ناقص بعد از ایندکس داده‌شده (برای راهنمایی به بخش بعدی)
  const nextIncompleteAfter = (index) => {
    for (let i = index + 1; i < VERIFICATION_SECTIONS.length; i += 1) {
      const s = VERIFICATION_SECTIONS[i];
      if (!sectionStatus(s, docs).complete) return s;
    }
    return null;
  };

  const mandatoryDone = VERIFICATION_SECTIONS.filter((s) => s.mandatory)
    .every((s) => sectionStatus(s, docs).complete);
  const totalUploaded = VERIFICATION_SECTIONS.reduce(
    (sum, s) => sum + sectionStatus(s, docs).uploaded,
    0,
  );

  return (
    <div className="space-y-3">
      {/* نوار وضعیت کلی */}
      <div className={`rounded-xl border px-3 py-2.5 text-xs ${verified
        ? 'border-emerald-200/80 bg-emerald-50/70 text-emerald-700'
        : 'border-amber-200/80 bg-amber-50/70 text-amber-700'}`}
      >
        <div className="flex items-center gap-1.5 font-bold">
          {verified ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
          {verified
            ? 'مدارک اجباری تکمیل شد — احراز هویت شما در صف بررسی است.'
            : 'احراز هویت فرایندی اجباری است؛ برای گرفتن بار باید گواهینامه و عکس شخصی را بارگذاری کنید.'}
        </div>
        <div className="mt-1.5 text-[11px] text-slate-500">
          {new Intl.NumberFormat('fa-IR').format(totalUploaded)} عکس بارگذاری شده ·{' '}
          {mandatoryDone ? 'موارد اجباری کامل' : 'موارد اجباری هنوز کامل نیست'}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {VERIFICATION_SECTIONS.map((section, index) => {
        const Icon = SECTION_ICONS[section.id] || Upload;
        const status = sectionStatus(section, docs);
        const next = status.complete ? nextIncompleteAfter(index) : null;

        return (
          <div
            key={section.id}
            ref={(el) => { sectionRefs.current[section.id] = el; }}
            className="rounded-2xl border border-white/60 bg-white/55 p-4"
          >
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">{section.title}</h4>
                  <span className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${section.mandatory
                    ? 'bg-rose-50 text-rose-600 border border-rose-200'
                    : 'bg-amber-50 text-amber-600 border border-amber-200'}`}
                  >
                    {section.mandatory ? 'اجباری' : 'نیمه‌اجباری'}
                  </span>
                </div>
              </div>
              {status.complete && (
                <span className="flex shrink-0 items-center gap-1 text-xs font-bold text-emerald-600">
                  <CheckCircle2 className="w-4 h-4" />
                  تکمیل شد
                </span>
              )}
            </div>

            <p className="mb-3 text-xs leading-6 text-slate-500">{section.description}</p>

            <div className={`grid gap-2 ${section.slots.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {section.slots.map((slot) => {
                const photo = docs[section.id]?.[slot.id];
                const slotKey = `${section.id}:${slot.id}`;
                const isBusy = busySlot === slotKey;
                return (
                  <div key={slot.id} className="relative">
                    <input
                      id={`${section.id}-${slot.id}`}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFile(section, slot, e)}
                    />
                    <label
                      htmlFor={`${section.id}-${slot.id}`}
                      className="group flex aspect-[8/5] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-slate-200 bg-white/60 text-slate-400 transition hover:border-blue-300 hover:bg-blue-50/40"
                    >
                      {photo ? (
                        <>
                          <img src={photo} alt={slot.label} className="absolute inset-0 h-full w-full object-contain" />
                          <span className="absolute inset-0 flex items-center justify-center bg-slate-900/50 text-white opacity-0 transition group-hover:opacity-100">
                            <Upload className="w-5 h-5" />
                          </span>
                        </>
                      ) : isBusy ? (
                        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                      ) : (
                        <>
                          <Upload className="mb-1 h-5 w-5" />
                          <span className="px-2 text-center text-[11px] font-medium">{slot.label}</span>
                        </>
                      )}
                    </label>
                    {photo && (
                      <button
                        type="button"
                        onClick={() => handleRemove(section, slot)}
                        title="حذف عکس"
                        className="absolute -top-1.5 -left-1.5 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-rose-500 shadow-sm transition hover:bg-rose-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* راهنمایی به بخش بعدی پس از تکمیل این بخش */}
            {next && (
              <button
                type="button"
                onClick={() => scrollToSection(next.id)}
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-blue-200/80 bg-blue-50/60 px-3 py-2 text-xs font-bold text-blue-600 transition hover:bg-blue-100/70"
              >
                تکمیل بخش بعدی: {next.title}
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
