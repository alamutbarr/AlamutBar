import { useState } from "react";
import { Wallet } from "lucide-react";
import StepHeader from "./StepHeader";
import Input from "../common/Input";
import Button from "../common/Button";
import { formatToman } from "../../utils/currency.util";
import { parseNumberInput } from "../../utils/digits";

const ROWS = [
  ["origin_address", "مبدأ"],
  ["dest_address", "مقصد"],
  ["weight_ton", "وزن (تن)"],
  ,
];

function formatWeightTon(value) {
  if (value === undefined || value === null || value === "") return "—";

  const [integerPart, fractionalPart] = String(value).split(".");
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  return fractionalPart === undefined
    ? formattedInteger
    : `${formattedInteger}.${fractionalPart}`;
}

function formatPriceInput(value) {
  if (value === "" || value === null || value === undefined) return "";

  const [integerPart, decimalPart] = String(value).split(".");
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  return decimalPart === undefined
    ? formattedInteger
    : `${formattedInteger}.${decimalPart}`;
}

export default function Step12_Confirm({ data, onChange, onSubmit }) {
  const [loading, setLoading] = useState(false);

  const priceInvalid = !data.proposed_price || data.proposed_price <= 0;
  const handlePriceChange = (e) => {
    const input = e.currentTarget;
    const cursor = input.selectionStart ?? input.value.length;
    const digitsBeforeCursor = (
      input.value.slice(0, cursor).match(/[0-9۰-۹٠-٩]/g) || []
    ).length;

    // مقدار خام و بدون comma وارد state می‌شود
    const rawValue = parseNumberInput(input.value);
    onChange("proposed_price", rawValue);

    const formattedValue = formatPriceInput(rawValue);

    // مکان‌نما را نسبت به تعداد رقم‌های قبل از آن حفظ می‌کنیم
    requestAnimationFrame(() => {
      let position = 0;
      let digits = 0;

      while (position < formattedValue.length && digits < digitsBeforeCursor) {
        if (/[0-9]/.test(formattedValue[position])) digits += 1;
        position += 1;
      }

      input.setSelectionRange(position, position);
    });
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await onSubmit();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <StepHeader
        title="کرایه پیشنهادی و بررسی نهایی"
        description="این مبلغ پیشنهاد شماست؛ قیمت نهایی توسط اپراتور بررسی و تأیید می‌شود."
      />

      <Input
        label="مبلغ کرایه پیشنهادی (تومان)"
        icon={Wallet}
        type="text"
        inputMode="decimal"
        className="tabular"
        value={formatPriceInput(data.proposed_price)}
        onChange={handlePriceChange}
        placeholder="مثلاً 3500000"
        required
      />

      <div className="divide-y divide-ink-50 rounded-lg border border-ink-100">
        {ROWS.map(([key, label]) => (
          <div
            key={key}
            className="flex justify-between gap-4 px-4 py-2.5 text-sm"
          >
            <span className="text-ink-300">{label}</span>
            <span className="max-w-[65%] truncate text-left font-medium text-ink-900">
              {data[key] || "—"}
            </span>
          </div>
        ))}
        <div className="flex justify-between gap-4 px-4 py-2.5 text-sm">
          <span className="text-ink-300">ارزش اعلامی</span>
          <span className="tabular font-medium text-ink-900">
            {formatToman(data.cargo_value)} تومان
          </span>
        </div>
        <div className="flex justify-between gap-4 px-4 py-2.5 text-sm">
          <span className="text-ink-300">گیرنده</span>
          <span className="font-medium text-ink-900">
            {data.receiver_name}{" "}
            <span className="tabular text-ink-300">
              ({data.receiver_phone})
            </span>
          </span>
        </div>
      </div>

      <Button
        variant="accent"
        size="lg"
        loading={loading}
        onClick={handleSubmit}
        disabled={priceInvalid}
        className="w-full"
      >
        تأیید و ارسال درخواست بار
      </Button>
    </div>
  );
}
