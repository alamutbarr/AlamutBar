"use client";
import { PanelError, usePanelRefresh } from "../panel-feedback";
import { useEffect, useState } from "react";
import { api, type Page } from "@/lib/api";
import { ActionForm } from "../forms";
import { Empty, Modal } from "../ui";
type Address = {
  id: number;
  label: string;
  city: string;
  address: string;
  recipient_name: string;
  phone: string;
};
export default function Addresses() {
  const [items, setItems] = useState<Page<Address> | null>(null),
    [selected, setSelected] = useState<Address | "new" | null>(null),
    [error, setError] = useState(""),
    [page, setPage] = useState(1);
  async function load() {
    try {
      setItems(await api("addresses/?page=" + page));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  usePanelRefresh(load);
  useEffect(() => {
    void load();
  }, [page]);
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>دفترچه نشانی و گیرندگان</h1>
          <p>نشانی‌های پرتکرار حمل را در حساب خود نگه دارید.</p>
        </div>
        <button className="btn" onClick={() => setSelected("new")}>
          نشانی جدید
        </button>
      </div>
      {error && <PanelError error={error} retry={() => void load()} />}
      <section className="card">
        {items?.results.map((a) => (
          <div className="notice" key={a.id}>
            <div>
              <b>
                {a.label} · {a.city}
              </b>
              <p>{a.address}</p>
              <small>
                {a.recipient_name} · {a.phone}
              </small>
            </div>
            <button className="secondary-btn" onClick={() => setSelected(a)}>
              ویرایش
            </button>
          </div>
        ))}
        {!items?.count && <Empty title="نشانی ذخیره‌شده ندارید" />}
        <div className="pagination">
          <button
            className="secondary-btn"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            قبلی
          </button>
          <button
            className="secondary-btn"
            disabled={!items?.next}
            onClick={() => setPage(page + 1)}
          >
            بعدی
          </button>
        </div>
      </section>
      {selected && (
        <Modal title="اطلاعات نشانی" onClose={() => setSelected(null)}>
          <ActionForm
            fields={[
              {
                name: "label",
                label: "عنوان نشانی",
                required: true,
                value: selected === "new" ? "" : selected.label,
              },
              {
                name: "city",
                label: "شهر",
                required: true,
                value: selected === "new" ? "" : selected.city,
              },
              {
                name: "address",
                label: "نشانی دقیق",
                required: true,
                type: "textarea",
                full: true,
                value: selected === "new" ? "" : selected.address,
              },
              {
                name: "recipient_name",
                label: "نام مخاطب",
                required: true,
                value: selected === "new" ? "" : selected.recipient_name,
              },
              {
                name: "phone",
                label: "موبایل",
                required: true,
                type: "tel",
                value: selected === "new" ? "" : selected.phone,
              },
            ]}
            onSubmit={async (d) => {
              await api(
                selected === "new"
                  ? "addresses/"
                  : "addresses/" + selected.id + "/",
                selected === "new" ? "POST" : "PATCH",
                d,
              );
              setSelected(null);
              await load();
            }}
          />
        </Modal>
      )}
    </>
  );
}
