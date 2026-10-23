import JalaliDatePicker from "../common/JalaliDatePicker";
import StepHeader from "./StepHeader";

const URGENCY_OPTIONS = [
  { value: "urgent", label: "فوری" },
  { value: "scheduled", label: "با فرصت" },
];

const TIME_RANGES = [
  { label: "۸ تا ۱۲", from: "08:00", to: "12:00" },
  { label: "۱۲ تا ۱۶", from: "12:00", to: "16:00" },
  { label: "۱۶ تا ۲۰", from: "16:00", to: "20:00" },
  { label: "۲۰ تا ۲۴", from: "20:00", to: "24:00" },
];

// فرمت ذخیره‌ی هر بازه: "08:00-12:00"
const rangeKey = (range) => `${range.from}-${range.to}`;

export default function Step8_DateUrgency({ data, onChange }) {
  const selectedKeys = data.loading_time_ranges || [];

  // انتخاب/لغو انتخاب یک بازه (Multi Select). آرایه همیشه به ترتیب بازه‌های صفحه نگه داشته می‌شود.
  const toggleRange = (range) => {
    const key = rangeKey(range);
    const next = TIME_RANGES.filter((r) =>
      rangeKey(r) === key
        ? !selectedKeys.includes(key)
        : selectedKeys.includes(rangeKey(r)),
    );
    onChange("loading_time_ranges", next.map(rangeKey));
    // loading_time_from/to = شروع اولین و پایان آخرین بازه‌ی انتخابی؛ برای سازگاری با Backend
    // (اعتبارسنجی، یادآوری ۲۴ ساعته) و اجباری بودن حداقل یک بازه در isStepValid
    onChange("loading_time_from", next.length ? next[0].from : "");
    onChange("loading_time_to", next.length ? next[next.length - 1].to : "");
  };

  return (
    <div className="space-y-5">
      <StepHeader
        title="انتخاب بازه زمانی"
        description="بازه‌ی زمانی آماده بودن بار برای تحویل به راننده."
      />

      <JalaliDatePicker
        label="تاریخ بارگیری"
        value={data.loading_date || ""}
        onChange={(iso) => onChange("loading_date", iso)}
        required
      />

      <fieldset>
        <legend className="mb-2 block text-sm font-medium text-ink-700">
          بازه‌ی بارگیری{" "}
          <span className="text-red-500" aria-hidden="true">
            *
          </span>
        </legend>
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          {TIME_RANGES.map((range) => {
            const isSelected = selectedKeys.includes(rangeKey(range));
            return (
              <button
                type="button"
                key={range.from}
                aria-pressed={isSelected}
                onClick={() => toggleRange(range)}
                className={`min-h-11 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                  isSelected
                    ? "border-amber-500 bg-amber-50 text-amber-700"
                    : "border-ink-100 text-ink-600 hover:border-ink-300"
                }`}
              >
                {range.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div>
        <span className="mb-1.5 block text-sm font-medium text-ink-700">
          فوریت
        </span>
        <div className="grid grid-cols-2 gap-2">
          {URGENCY_OPTIONS.map((opt) => (
            <button
              type="button"
              key={opt.value}
              onClick={() => onChange("urgency", opt.value)}
              className={`rounded-lg border px-3 py-2.5 text-xs font-medium transition-colors ${
                data.urgency === opt.value
                  ? "border-amber-500 bg-amber-50 text-amber-700"
                  : "border-ink-100 text-ink-500 hover:border-ink-300"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
