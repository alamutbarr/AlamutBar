import { useMemo, useState } from 'react';
import { ArrowRight, Check, ChevronLeft, Pencil, Truck } from 'lucide-react';
import { TRACTOR_TYPES, TRAILER_TYPES, getVehicleFields } from '@/vehicleConfig';

const FIELD_ORDER = ['length', 'width', 'edgeHeight', 'roomHeight', 'floor', 'weight'];

function orderedFields(tractorType, trailerType) {
  const fields = getVehicleFields(tractorType, trailerType);
  return [...fields].sort((a, b) => {
    const left = FIELD_ORDER.indexOf(a.key);
    const right = FIELD_ORDER.indexOf(b.key);
    return (left === -1 ? 99 : left) - (right === -1 ? 99 : right);
  });
}

function labelOf(options, value) {
  return options?.find((option) => option.value === value)?.label || '';
}

function rawValue(step, tractorType, trailerType, specs) {
  if (step.id === 'tractor') return tractorType;
  if (step.id === 'trailer') return trailerType;
  if (step.field) return specs[step.field.key] || '';
  return '';
}

function optionsFor(step, tractorType) {
  if (step.id === 'tractor') return TRACTOR_TYPES;
  if (step.id === 'trailer') return TRAILER_TYPES[tractorType] || [];
  return step.field?.options || [];
}

function isComplete(step, tractorType, trailerType, specs) {
  if (step.id === 'summary') return true;
  const value = rawValue(step, tractorType, trailerType, specs);
  if (!value) return false;
  return optionsFor(step, tractorType).some((option) => option.value === value);
}

function nextIndex(steps, fromIndex, tractorType, trailerType, specs) {
  for (let index = fromIndex + 1; index < steps.length; index += 1) {
    if (!isComplete(steps[index], tractorType, trailerType, specs)) return index;
  }
  return steps.length - 1;
}

export function VehicleWizard({
  tractorType,
  trailerType,
  specs,
  onTractor,
  onTrailer,
  onSpec,
  onBack,
  onConfirm,
  loading,
  error,
}) {
  const steps = useMemo(() => {
    const list = [
      { id: 'tractor', title: 'نوع کشنده' },
      { id: 'trailer', title: 'نوع گاری' },
      ...orderedFields(tractorType, trailerType).map((field) => ({
        id: field.key,
        title: field.title,
        field,
      })),
      { id: 'summary', title: 'بازبینی' },
    ];
    return list;
  }, [tractorType, trailerType]);

  const [currentId, setCurrentId] = useState('tractor');
  const [maxReached, setMaxReached] = useState(0);
  const [returnToSummary, setReturnToSummary] = useState(false);
  const foundIndex = steps.findIndex((step) => step.id === currentId);
  const currentIndex = foundIndex === -1
    ? nextIndex(steps, -1, tractorType, trailerType, specs)
    : foundIndex;
  const current = steps[currentIndex] || steps[0];
  const fillPercent = Math.round((currentIndex / Math.max(1, steps.length - 1)) * 100);
  const summaryIndex = steps.findIndex((step) => step.id === 'summary');

  const goTo = (index) => {
    const next = Math.max(0, Math.min(steps.length - 1, index));
    setCurrentId(steps[next].id);
    setMaxReached((value) => Math.max(value, next));
  };

  const valueOf = (step) => {
    if (step.id === 'summary') return '';
    return labelOf(optionsFor(step, tractorType), rawValue(step, tractorType, trailerType, specs));
  };

  const canAdvance = () => isComplete(current, tractorType, trailerType, specs);

  const next = () => {
    const missing = steps.find((step) => !isComplete(step, tractorType, trailerType, specs));
    if (current.id === 'summary') {
      if (missing) {
        goTo(steps.findIndex((step) => step.id === missing.id));
        return;
      }
      onConfirm();
      return;
    }
    if (!canAdvance()) return;
    if (returnToSummary) {
      const target = nextIndex(steps, currentIndex, tractorType, trailerType, specs);
      if (target === summaryIndex) setReturnToSummary(false);
      goTo(target);
      return;
    }
    goTo(currentIndex + 1);
  };

  const back = () => {
    if (returnToSummary && canAdvance()) {
      setReturnToSummary(false);
      goTo(summaryIndex);
      return;
    }
    if (currentIndex === 0) onBack();
    else goTo(currentIndex - 1);
  };

  const editStep = (stepId) => {
    setReturnToSummary(true);
    goTo(steps.findIndex((step) => step.id === stepId));
  };

  const options = current.id === 'tractor'
    ? TRACTOR_TYPES
    : current.id === 'trailer'
      ? (TRAILER_TYPES[tractorType] || [])
      : (current.field?.options || []);

  const selected = current.id === 'tractor'
    ? tractorType
    : current.id === 'trailer'
      ? trailerType
      : specs[current.id];

  const choose = (value) => {
    if (current.id === 'tractor') onTractor(value);
    else if (current.id === 'trailer') onTrailer(value);
    else if (current.field) onSpec(current.field.key, value);
  };

  return (
    <div>
      <button type="button" onClick={back} className="mb-4 flex items-center gap-1 text-sm text-[#526d70] hover:text-[#17383b]">
        <ArrowRight className="h-4 w-4" />
        {currentIndex === 0 ? 'بازگشت' : 'مرحله قبل'}
      </button>

      <div className="mb-4 overflow-visible rounded-md border border-[#d8e1dc] bg-white px-3 py-3">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-[#526d70]">مشخصات خودرو</p>
            <p className="truncate text-base font-bold text-[#17383b]">{current.title}</p>
          </div>
          <span className="shrink-0 rounded-md bg-[#17383b] px-2.5 py-1 text-[11px] text-[#f7f6f0]">
            <bdi dir="ltr">{(currentIndex + 1).toLocaleString('fa-IR')}</bdi>
            {' '}از{' '}
            <bdi dir="ltr">{steps.length.toLocaleString('fa-IR')}</bdi>
          </span>
        </div>
        <div className="relative mb-3 h-1.5 overflow-hidden rounded-md bg-[#e6eeea]">
          <div className="absolute inset-y-0 right-0 rounded-md bg-[#d7b56d]" style={{ width: `${fillPercent}%` }} />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {steps.map((step, index) => {
            const done = index < currentIndex && Boolean(valueOf(step) || step.id === 'summary');
            const active = index === currentIndex;
            const reachable = index <= maxReached;
            return (
              <button
                type="button"
                key={step.id}
                onClick={() => reachable && goTo(index)}
                disabled={!reachable}
                className={`flex shrink-0 items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs transition ${
                  active
                    ? 'border-[#087f8c] bg-[#087f8c] text-[#f7f6f0]'
                    : done
                      ? 'border-[#17383b] bg-[#17383b] text-[#f7f6f0]'
                      : reachable
                        ? 'border-[#d8e1dc] bg-[#f7f6f0] text-[#17383b]'
                        : 'cursor-not-allowed border-[#e6eeea] bg-[#f7f6f0] text-[#9aada8]'
                }`}
              >
                <span className={`flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-[11px] font-bold ${active || done ? 'bg-white/15' : 'bg-white text-[#526d70]'}`}>
                  {done ? <Check size={13} /> : (index + 1).toLocaleString('fa-IR')}
                </span>
                <span className="whitespace-nowrap font-medium">{step.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {current.id !== 'summary' ? (
        <div className="rounded-md border border-[#d8e1dc] bg-white p-4">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[#e1f3f0] text-[#087f8c]">
              <Truck size={20} />
            </span>
            <div>
              <h2 className="text-base font-bold text-[#17383b]">{current.title}</h2>
              <p className="text-xs text-[#526d70]">یک گزینه را انتخاب کنید.</p>
            </div>
          </div>
          {!options.length && (
            <p className="text-sm text-[#526d70]">اول نوع کشنده را انتخاب کنید.</p>
          )}
          <div className="grid gap-2">
            {options.map((option) => {
              const active = selected === option.value;
              return (
                <button
                  type="button"
                  key={option.value}
                  onClick={() => choose(option.value)}
                  className={`rounded-md border px-3 py-3 text-right text-sm font-medium transition ${
                    active
                      ? 'border-[#087f8c] bg-[#e1f3f0] text-[#17383b]'
                      : 'border-[#d8e1dc] bg-[#f7f6f0] text-[#17383b] hover:border-[#087f8c]'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="rounded-md border border-[#d8e1dc] bg-white p-4">
          <h2 className="mb-3 text-base font-bold text-[#17383b]">خلاصه انتخاب‌ها</h2>
          <div className="divide-y divide-[#e6eeea]">
            {steps.filter((step) => step.id !== 'summary').map((step) => (
              <div key={step.id} className="flex items-center justify-between gap-3 py-2.5">
                <div>
                  <p className="text-[11px] text-[#526d70]">{step.title}</p>
                  <p className="text-sm font-bold text-[#17383b]">{valueOf(step) || 'انتخاب نشده'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => editStep(step.id)}
                  className="inline-flex items-center gap-1 rounded-md border border-[#d8e1dc] px-2.5 py-1.5 text-xs font-bold text-[#087f8c]"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  ویرایش
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <p className="mt-4 text-center text-sm font-medium text-red-500">{error}</p>}

      <button
        type="button"
        onClick={next}
        disabled={loading || (current.id !== 'summary' && !canAdvance())}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-[#087f8c] py-3.5 font-bold text-[#f7f6f0] transition hover:bg-[#10282b] disabled:opacity-60"
      >
        {current.id === 'summary' ? (loading ? 'در حال ثبت...' : 'تأیید و ورود') : (
          <>
            {returnToSummary && nextIndex(steps, currentIndex, tractorType, trailerType, specs) === summaryIndex
              ? 'بازگشت به بازبینی'
              : 'ادامه'}
            <ChevronLeft className="h-4 w-4" />
          </>
        )}
      </button>
    </div>
  );
}
