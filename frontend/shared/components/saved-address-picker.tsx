"use client";
import { useEffect, useState, type ChangeEvent } from "react";
import { api, type Page } from "@/lib/api";
type Address = {
  id: number;
  label: string;
  city: string;
  address: string;
  recipient_name: string;
  phone: string;
};
export default function SavedAddressPicker() {
  const [items, setItems] = useState<Page<Address> | null>(null),
    [page, setPage] = useState(1),
    [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    api<Page<Address>>("addresses/?page=" + page)
      .then((data) => {
        if (!cancelled) {
          setItems(data);
          setError("");
        }
      })
      .catch(() => {
        if (!cancelled)
          setError(
            "نشانی‌های ذخیره‌شده دریافت نشد؛ می‌توانید نشانی را در فرم وارد کنید.",
          );
      });
    return () => {
      cancelled = true;
    };
  }, [page]);
  function apply(
    event: ChangeEvent<HTMLSelectElement>,
    kind: "origin" | "destination",
  ) {
    const item = items?.results.find(
        (a) => a.id === Number(event.target.value),
      ),
      form = event.currentTarget.form;
    if (!item || !form) return;
    const values: Record<string, string> = {
      [kind]: item.city,
      [kind + "_address"]: item.address,
    };
    if (kind === "destination") {
      values.recipient_name = item.recipient_name;
      values.recipient_phone = item.phone;
    }
    for (const [name, value] of Object.entries(values)) {
      const field = form.elements.namedItem(name);
      if (
        field instanceof HTMLInputElement ||
        field instanceof HTMLTextAreaElement
      )
        field.value = value;
    }
  }
  if (error)
    return (
      <p className="info-note" role="status">
        {error}
      </p>
    );
  if (!items?.count)
    return (
      <p className="info-note">
        برای استفاده از نشانی‌های پرتکرار، ابتدا آن‌ها را در «دفترچه نشانی»
        ذخیره کنید.
      </p>
    );
  return (
    <fieldset className="saved-address-picker">
      <legend>انتخاب از دفترچه نشانی</legend>
      <div className="form-grid">
        {(["origin", "destination"] as const).map((kind) => (
          <label key={kind}>
            {kind === "origin"
              ? "نشانی بارگیری ذخیره‌شده"
              : "نشانی تخلیه و گیرنده ذخیره‌شده"}
            <select
              defaultValue=""
              key={kind + page}
              onChange={(event) => apply(event, kind)}
            >
              <option value="">انتخاب اختیاری</option>
              {items.results.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label} · {item.city}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      {(items.next || page > 1) && (
        <div className="pagination">
          <button
            type="button"
            className="secondary-btn"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            نشانی‌های قبلی
          </button>
          <button
            type="button"
            className="secondary-btn"
            disabled={!items.next}
            onClick={() => setPage(page + 1)}
          >
            نشانی‌های بعدی
          </button>
        </div>
      )}
      <small>
        انتخاب نشانی، فیلدهای همان مقصد را پر می‌کند؛ پیش از ثبت آن‌ها را
        بازبینی کنید.
      </small>
    </fieldset>
  );
}
