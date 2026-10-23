import { User, Phone, Fingerprint, MapPin } from "lucide-react";
import Input from "../common/Input";
import StepHeader from "./StepHeader";
import { toEnglishDigits } from "../../utils/digits";
import {
  isValidIranNationalId,
  isValidIranPostalCode,
} from "../../utils/receiverValidation";

export default function Step11_Contact({ data, onChange }) {
  const nationalId = data.receiver_national_id || "";
  const postalCode = data.receiver_postal_code || "";
  const receiverPhone = data.receiver_phone || "";
  const receiverPhoneInvalid =
    receiverPhone !== "" && !/^09\d{9}$/.test(receiverPhone);
  const nationalIdInvalid =
    nationalId !== "" && !isValidIranNationalId(nationalId);
  const postalCodeInvalid =
    postalCode !== "" && !isValidIranPostalCode(postalCode);
  return (
    <div className="space-y-5">
      <StepHeader
        title="اطلاعات گیرنده‌ی بار"
        description="این اطلاعات فقط در اختیار راننده و متصدی مأموریت قرار می‌گیرد."
      />
      <Input
        label="نام و نام خانوادگی گیرنده"
        icon={User}
        value={data.receiver_name || ""}
        onChange={(e) => onChange("receiver_name", e.target.value)}
        placeholder="علی رضایی"
        required
      />
      <Input
        label="شماره تماس گیرنده"
        required
        icon={Phone}
        dir="ltr"
        className="tabular text-left"
        type="text"
        inputMode="numeric"
        value={receiverPhone}
        onChange={(e) =>
          onChange("receiver_phone", toEnglishDigits(e.target.value))
        }
        placeholder="09123456789"
        error={receiverPhoneInvalid ? "شماره موبایل معتبر نیست." : undefined}
      />

      <Input
        label="کد ملی گیرنده (اختیاری)"
        icon={Fingerprint}
        dir="ltr"
        className="tabular text-left"
        type="text"
        inputMode="numeric"
        value={nationalId}
        onChange={(e) =>
          onChange(
            "receiver_national_id",
            toEnglishDigits(e.target.value).replace(/[^\d]/g, ""),
          )
        }
        placeholder="کد ملی گیرنده"
        error={nationalIdInvalid ? "کد ملی گیرنده باید دقیقاً ۱۰ رقم باشد." : undefined}
      />
      <Input
        label="کد پستی گیرنده (اختیاری)"
        icon={MapPin}
        dir="ltr"
        className="tabular text-left"
        type="text"
        inputMode="numeric"
        value={postalCode}
        onChange={(e) =>
          onChange(
            "receiver_postal_code",
            toEnglishDigits(e.target.value).replace(/[^\d]/g, ""),
          )
        }
        placeholder="کد پستی گیرنده"
        error={postalCodeInvalid ? "کد پستی معتبر نیست." : undefined}
      />
    </div>
  );
}
