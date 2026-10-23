import { ArrowUpFromLine } from "lucide-react";
import StepHeader from "./StepHeader";

const METHODS = [
  { value: "forklift", label: "لیفتراک" },
  { value: "crane", label: "جرثقیل" },
  { value: "manual", label: "دستی" },
  { value: "ramp", label: "رمپ" },
  { value: "other", label: "سایر" },
];

function MethodPicker({ icon: Icon, title, value, onSelect }) {
  return (
    <div>
      <span className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-ink-700">
        <Icon size={15} />
        {title}
      </span>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {METHODS.map((m) => (
          <button
            type="button"
            key={m.value}
            onClick={() => onSelect(m.value)}
            className={`rounded-lg border px-2 py-2.5 text-xs font-medium transition-colors ${
              value === m.value
                ? "border-amber-500 bg-amber-50 text-amber-700"
                : "border-ink-100 text-ink-500 hover:border-ink-300"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Step10_HandlingMethods({ data, onChange }) {
  return (
    <div className="space-y-6">
      <StepHeader
        title="نحوه‌ی بارگیری"
        description="تجهیزات مورد نیاز برای بارگیری در مبدأ."
      />
      <MethodPicker
        icon={ArrowUpFromLine}
        title="نوع بارگیری در مبدأ"
        value={data.loading_method}
        onSelect={(v) => onChange("loading_method", v)}
      />
    </div>
  );
}
