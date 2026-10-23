import { useEffect, useState } from "react";
import Modal from "../common/Modal";
import Button from "../common/Button";
import StatusBadge from "../common/StatusBadge";
import ShipmentFacts from "./ShipmentFacts";
import ShipmentEditForm, { formToPayload, shipmentToForm } from "./ShipmentEditForm";
import { getShipmentById, updateShipment } from "../../api/shipment.api";
import { canEditShipment } from "../../utils/shipmentPresent";
import { getErrorMessage } from "../../utils/errorMessage";

export default function ShipmentDetailsModal({ shipmentId, open, onClose, onSaved }) {
  const [shipment, setShipment] = useState(null);
  const [form, setForm] = useState(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !shipmentId) return undefined;
    let cancelled = false;
    setEditing(false);
    setError("");
    setLoading(true);
    getShipmentById(shipmentId)
      .then((row) => {
        if (cancelled) return;
        setShipment(row);
        setForm(shipmentToForm(row));
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err, "جزئیات بار خوانده نشد."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, shipmentId]);

  const save = async () => {
    if (!form) return;
    if (String(form.origin_city_name || "").trim() === "تهران" && !form.origin_zone_id) {
      setError("برای شهر تهران، محدوده مبدأ الزامی است.");
      return;
    }
    if (!form.loading_time_ranges?.length) {
      setError("حداقل یک بازهٔ بارگیری را انتخاب کنید.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const updated = await updateShipment(shipmentId, formToPayload(form));
      setShipment(updated);
      setForm(shipmentToForm(updated));
      setEditing(false);
      onSaved?.(updated);
    } catch (err) {
      setError(getErrorMessage(err, "به‌روزرسانی بار انجام نشد."));
    } finally {
      setSaving(false);
    }
  };

  const editable = canEditShipment(shipment);

  return (
    <Modal
      wide
      open={open}
      onClose={onClose}
      title={editing ? "ویرایش مشخصات بار" : "جزئیات بار"}
      footer={
        editing ? (
          <>
            <Button variant="ghost" onClick={() => { setEditing(false); setError(""); setForm(shipment ? shipmentToForm(shipment) : form); }}>
              انصراف
            </Button>
            <Button variant="accent" loading={saving} onClick={save}>
              تأیید و به‌روزرسانی
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose}>بستن</Button>
            {editable && (
              <Button variant="accent" onClick={() => setEditing(true)} disabled={!form}>
                ویرایش
              </Button>
            )}
          </>
        )
      }
    >
      {loading && <p className="py-8 text-center text-sm text-ink-300">در حال خواندن مشخصات...</p>}
      {!loading && error && !shipment && <p className="py-6 text-sm text-red-600">{error}</p>}
      {!loading && shipment && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="tabular text-base font-bold text-[#17383b]">{shipment.tracking_code}</p>
            <StatusBadge status={shipment.status} />
          </div>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
          {!editable && !editing && (
            <p className="rounded-lg bg-[#f7f6f0] px-3 py-2 text-xs text-[#526d70]">
              این بار به راننده سپرده شده و فقط قابل مشاهده است.
            </p>
          )}
          {editing && form ? <ShipmentEditForm form={form} onChange={setForm} /> : <ShipmentFacts shipment={shipment} />}
        </div>
      )}
    </Modal>
  );
}
