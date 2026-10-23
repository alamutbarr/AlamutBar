import { formatToman } from "../../utils/currency.util";
import {
  HANDLING_LABELS,
  URGENCY_LABELS,
  cargoTypeLabel,
  cityLine,
  dimensionsLabel,
  formatFaNumber,
  formatIsoDate,
  timeWindowLabel,
} from "../../utils/shipmentPresent";

function Fact({ label, value }) {
  return (
    <div className="rounded-xl bg-[#f7f6f0] px-3 py-2.5">
      <p className="text-[11px] text-[#526d70]">{label}</p>
      <p className="mt-1 text-sm font-semibold leading-6 text-[#17383b]">{value || "—"}</p>
    </div>
  );
}

function Group({ title, children }) {
  return (
    <section className="space-y-2">
      <h4 className="text-xs font-bold text-[#087f8c]">{title}</h4>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export default function ShipmentFacts({ shipment }) {
  const price = formatToman(shipment.operator_price || shipment.proposed_price);
  const cargoValue = formatToman(Number(shipment.cargo_value) / 10);
  const variants = Array.isArray(shipment.vehicle_variants)
    ? shipment.vehicle_variants.join("، ")
    : "";

  return (
    <div className="space-y-4">
      <Group title="مسیر">
        <Fact label="مبدأ" value={cityLine(shipment.originCity, shipment.originZone)} />
        <Fact label="مقصد" value={cityLine(shipment.destCity, shipment.destZone)} />
        <Fact label="آدرس مبدأ" value={shipment.origin_address} />
        <Fact label="آدرس مقصد" value={shipment.dest_address || "ثبت نشده"} />
      </Group>

      <Group title="کالا">
        <Fact label="نوع کالا" value={cargoTypeLabel(shipment)} />
        <Fact label="بسته‌بندی" value={shipment.packaging_type || "ثبت نشده"} />
        <Fact label="وزن" value={shipment.weight_kg ? `${formatFaNumber(shipment.weight_kg)} کیلوگرم` : "—"} />
        <Fact label="ابعاد" value={dimensionsLabel(shipment)} />
        <Fact label="ارزش کالا" value={cargoValue ? `${cargoValue} (${formatFaNumber(shipment.cargo_value)} ریال)` : "—"} />
        <Fact label="توضیحات" value={shipment.notes || "ثبت نشده"} />
      </Group>

      <Group title="زمان بارگیری">
        <Fact label="تاریخ" value={formatIsoDate(shipment.loading_date)} />
        <Fact label="بازه" value={timeWindowLabel(shipment)} />
        <Fact label="فوریت" value={URGENCY_LABELS[shipment.urgency] || shipment.urgency} />
      </Group>

      <Group title="خودرو و بارگیری">
        <Fact label="خودرو" value={shipment.vehicleType?.title || "—"} />
        <Fact label="نوع گاری" value={variants || "—"} />
        <Fact label="نحوه بارگیری" value={HANDLING_LABELS[shipment.loading_method] || "—"} />
        <Fact label="کرایه پیشنهادی" value={price || "—"} />
      </Group>

      <Group title="گیرنده">
        <Fact label="نام" value={shipment.receiver_name} />
        <Fact label="موبایل" value={shipment.receiver_phone} />
        <Fact label="کد ملی" value={shipment.receiver_national_id || "ثبت نشده"} />
        <Fact label="کد پستی" value={shipment.receiver_postal_code || "ثبت نشده"} />
      </Group>
    </div>
  );
}
