import { useState } from "react";
import { CalendarClock, ChevronLeft, ChevronRight } from "lucide-react";
import {
  JALALI_MONTHS,
  JALALI_WEEKDAYS_SHORT,
  isoToJalali,
  jalaliToIso,
  jalaliMonthLength,
  jalaliFirstWeekday,
  todayJalali,
  formatJalali,
  toPersianDigits,
} from "../../utils/jalali.util";

const keyOf = (jy, jm, jd) => jy * 10000 + jm * 100 + jd;

// انتخاب تاریخ شمسی. ورودی/خروجی (value / onChange) تاریخ میلادی ISO به‌شکل YYYY-MM-DD است
// تا Backend و Database بدون تغییر کار کنند؛ کاربر فقط تاریخ شمسی می‌بیند.
// تقویم داخل جریان صفحه باز می‌شود (نه شناور) چون کارت اصلی overflow-hidden دارد.
export default function JalaliDatePicker({ label, value, onChange, required }) {
  const today = todayJalali();
  const selected = isoToJalali(value);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(selected || today);

  const toggle = () => {
    if (!open) setView(selected || today);
    setOpen((o) => !o);
  };

  const canGoPrev = keyOf(view.jy, view.jm, 1) > keyOf(today.jy, today.jm, 1);
  const goPrev = () => {
    if (!canGoPrev) return;
    setView((v) =>
      v.jm === 1 ? { jy: v.jy - 1, jm: 12 } : { jy: v.jy, jm: v.jm - 1 },
    );
  };
  const goNext = () => {
    setView((v) =>
      v.jm === 12 ? { jy: v.jy + 1, jm: 1 } : { jy: v.jy, jm: v.jm + 1 },
    );
  };

  const pick = (jd) => {
    onChange(jalaliToIso(view.jy, view.jm, jd));
    setOpen(false);
  };

  const blanks = jalaliFirstWeekday(view.jy, view.jm);
  const daysCount = jalaliMonthLength(view.jy, view.jm);
  const todayKey = keyOf(today.jy, today.jm, today.jd);
  const selectedKey = selected
    ? keyOf(selected.jy, selected.jm, selected.jd)
    : null;

  return (
    <div>
      {label && (
        <span className="mb-1.5 flex items-baseline gap-1 text-sm font-medium text-ink-700">
          {label}
          {required && <span className="text-amber-600">*</span>}
        </span>
      )}

      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="relative flex w-full items-center rounded-lg border border-ink-100 bg-white px-3.5 py-2.5 pr-10 text-right text-sm text-ink-900 transition-colors focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
      >
        <CalendarClock
          size={17}
          className="pointer-events-none absolute right-3 text-ink-300"
        />
        {selected ? (
          <span className="tabular">
            {formatJalali(selected.jy, selected.jm, selected.jd)}
          </span>
        ) : (
          <span className="text-ink-300">انتخاب تاریخ</span>
        )}
      </button>

      {open && (
        <div className="mt-2 rounded-xl border border-ink-100 bg-white p-3">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={goPrev}
              disabled={!canGoPrev}
              aria-label="ماه قبل"
              className="rounded-lg p-1.5 text-ink-500 transition-colors hover:bg-ink-50 disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <ChevronRight size={18} />
            </button>
            <span className="text-sm font-semibold text-ink-900">
              {JALALI_MONTHS[view.jm - 1]} {toPersianDigits(view.jy)}
            </span>
            <button
              type="button"
              onClick={goNext}
              aria-label="ماه بعد"
              className="rounded-lg p-1.5 text-ink-500 transition-colors hover:bg-ink-50"
            >
              <ChevronLeft size={18} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {JALALI_WEEKDAYS_SHORT.map((w) => (
              <span key={w} className="py-1 font-medium text-ink-300">
                {w}
              </span>
            ))}

            {Array.from({ length: blanks }).map((_, i) => (
              <span key={`b${i}`} />
            ))}

            {Array.from({ length: daysCount }, (_, i) => i + 1).map((jd) => {
              const k = keyOf(view.jy, view.jm, jd);
              const isPast = k < todayKey;
              const isSelected = k === selectedKey;
              const isToday = k === todayKey;
              return (
                <button
                  type="button"
                  key={jd}
                  disabled={isPast}
                  onClick={() => pick(jd)}
                  className={`rounded-lg py-1.5 text-sm transition-colors ${
                    isSelected
                      ? "bg-amber-500 font-semibold text-ink-950"
                      : isToday
                        ? "border border-amber-400 text-ink-900 hover:bg-amber-50"
                        : "text-ink-700 hover:bg-amber-50"
                  } disabled:cursor-not-allowed disabled:text-ink-100 disabled:hover:bg-transparent`}
                >
                  {toPersianDigits(jd)}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
