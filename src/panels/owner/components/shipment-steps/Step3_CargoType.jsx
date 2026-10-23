import Input from "../common/Input";
import SearchableSelect from "../common/SearchableSelect";
import StepHeader from "./StepHeader";
import CARGO_TYPES from "../../../../shared/cargoTypes.json";

const cargoOptions = [
  ...CARGO_TYPES.filter((name) => name !== "سایر").map((name) => ({
    value: name,
    label: name,
  })),
  { value: "other", label: "سایر" },
];

export default function Step3_CargoType({ data, onChange }) {
  return (
    <div className="space-y-5">
      <StepHeader
        title="نوع و مشخصات بار"
        description="کالای خودتون رو با جزئیات کافی توصیف کنید تا راننده‌ی مناسب پیدا بشه."
      />

      <SearchableSelect
        label="نوع کالا"
        value={data.cargo_type || ""}
        options={cargoOptions}
        stickyOptionValue="other"
        onChange={(value) => onChange("cargo_type", value)}
        placeholder="جستجو یا انتخاب نوع کالا..."
        required
        noResultsText="نوع کالایی با این مشخصات یافت نشد"
      />

      {data.cargo_type === "other" && (
        <Input
          label="توضیح نوع کالا"
          value={data.cargo_type_other || ""}
          onChange={(e) => onChange("cargo_type_other", e.target.value)}
          placeholder="نوع کالا را توضیح دهید"
          required
        />
      )}

      <Input
        label="نوع بسته‌بندی (اختیاری)"
        value={data.packaging_type || ""}
        onChange={(e) => onChange("packaging_type", e.target.value)}
        placeholder="مثلاً: پالت‌بندی‌شده، کارتنی، فله"
      />
    </div>
  );
}
