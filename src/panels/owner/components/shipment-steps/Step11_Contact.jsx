import { useAuth } from "../../hooks/useAuth";
import Input from "../common/Input";
import { toEnglishDigits } from "../../utils/digits";
import {
  isValidIranNationalId,
  isValidIranPostalCode,
} from "../../utils/receiverValidation";

export default function Step11_Contact({ data, onChange }) {
  const { user } = useAuth();
  const choice = data.receiver_is_self || "";
  const nationalId = data.receiver_national_id || "";
  const postalCode = data.receiver_postal_code || "";
  const receiverPhone = data.receiver_phone || "";
  const receiverPhoneInvalid = receiverPhone !== "" && !/^09\d{9}$/.test(receiverPhone);
  const nationalIdInvalid = nationalId !== "" && !isValidIranNationalId(nationalId);
  const postalCodeInvalid = postalCode !== "" && !isValidIranPostalCode(postalCode);

  const choose = (value) => {
    onChange("receiver_is_self", value);
    if (value === "yes") {
      const name = [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim();
      onChange("receiver_name", name || user?.phone_number || "");
      onChange("receiver_phone", user?.phone_number || "");
      onChange("receiver_national_id", user?.national_id || "");
      onChange("receiver_postal_code", user?.postal_code || "");
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-[#17383b]">گیرندهٔ بار</h2>
        <p className="mt-1 text-sm text-[#526d70]">این بار برای خودتان است؟</p>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => choose("yes")}
          className={`rounded-lg border px-4 py-3 text-sm font-bold ${
            choice === "yes" ? "border-[#087f8c] bg-[#e7f4f5] text-[#087f8c]" : "border-[#d8e1dc] text-[#17383b]"
          }`}
        >
          بله، بار برای خودم است
        </button>
        <button
          type="button"
          onClick={() => choose("no")}
          className={`rounded-lg border px-4 py-3 text-sm font-bold ${
            choice === "no" ? "border-[#087f8c] bg-[#e7f4f5] text-[#087f8c]" : "border-[#d8e1dc] text-[#17383b]"
          }`}
        >
          خیر، بار برای شخص دیگری است
        </button>
      </div>
      {choice === "yes" && (
        <p className="rounded-lg bg-[#f7f6f0] px-3 py-2 text-sm text-[#17383b]">
          گیرنده همان حساب شماست
          {data.receiver_name ? ` (${data.receiver_name}` : ""}
          {data.receiver_phone ? ` — ${data.receiver_phone})` : data.receiver_name ? ")" : ""}
          .
        </p>
      )}
      {choice === "no" && (
        <>
          <Input
            label="نام و نام خانوادگی گیرنده"
            value={data.receiver_name || ""}
            onChange={(e) => onChange("receiver_name", e.target.value)}
            placeholder="علی رضایی"
            required
          />
          <Input
            label="شماره تماس گیرنده"
            required
            dir="ltr"
            className="tabular text-left"
            type="text"
            inputMode="numeric"
            value={receiverPhone}
            onChange={(e) => onChange("receiver_phone", toEnglishDigits(e.target.value))}
            placeholder="09123456789"
            error={receiverPhoneInvalid ? "شماره موبایل معتبر نیست." : undefined}
          />
          <Input
            label="کد ملی گیرنده (اختیاری)"
            dir="ltr"
            className="tabular text-left"
            type="text"
            inputMode="numeric"
            value={nationalId}
            onChange={(e) => onChange("receiver_national_id", toEnglishDigits(e.target.value).replace(/[^\d]/g, ""))}
            placeholder="کد ملی گیرنده"
            error={nationalIdInvalid ? "کد ملی گیرنده باید دقیقاً ۱۰ رقم باشد." : undefined}
          />
          <Input
            label="کد پستی گیرنده (اختیاری)"
            dir="ltr"
            className="tabular text-left"
            type="text"
            inputMode="numeric"
            value={postalCode}
            onChange={(e) => onChange("receiver_postal_code", toEnglishDigits(e.target.value).replace(/[^\d]/g, ""))}
            placeholder="کد پستی گیرنده"
            error={postalCodeInvalid ? "کد پستی معتبر نیست." : undefined}
          />
        </>
      )}
    </div>
  );
}
