"use client";
import {
  api,
  complaintStatuses,
  complaintTypes,
  date,
  type Page,
  type Role,
  type Shipment,
} from "@/lib/api";
import { useEffect, useState, type FormEvent } from "react";
import { Badge, Empty } from "../ui";

type Complaint = {
  id: number;
  type: string;
  shipment: number | null;
  shipment_code: string;
  description: string;
  status: string;
  created_at: string;
  user_name: string;
  messages: { id: number; author_name: string; role: string; body: string }[];
  photos: { id: number; url: string }[];
};

export default function Complaints({ role }: { role: Role }) {
  const [items, setItems] = useState<Page<Complaint> | null>(null);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [selected, setSelected] = useState<Complaint | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState("");

  async function load(keep?: number) {
    const page = await api<Page<Complaint>>("complaints/");
    setItems(page);
    setSelected((current) => {
      const id = keep || current?.id;
      return page.results.find((item) => item.id === id) || current;
    });
    if (role === "owner") {
      const cargo = await api<Page<Shipment>>("shipments/?page=1");
      setShipments(cargo.results);
    }
  }

  useEffect(() => {
    void load().catch((e: Error) => setError(e.message));
  }, [role]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const shipment = String(data.get("shipment") || "");
    const files = data
      .getAll("photos")
      .filter((file): file is File => file instanceof File && file.size > 0)
      .slice(0, 10);
    setBusy(true);
    setError("");
    try {
      const created = await api<Complaint>("complaints/", "POST", {
        type: String(data.get("type") || ""),
        shipment: shipment ? Number(shipment) : null,
        description: String(data.get("description") || ""),
      });
      for (const file of files) {
        const body = new FormData();
        body.append("file", file);
        await api("complaints/" + created.id + "/photos/", "POST", body);
      }
      form.reset();
      await load(created.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function sendReply(event: FormEvent) {
    event.preventDefault();
    if (!selected || !reply.trim()) return;
    setBusy(true);
    setError("");
    try {
      await api("complaints/" + selected.id + "/reply/", "POST", {
        body: reply.trim(),
      });
      setReply("");
      await load(selected.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function review(status: string) {
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      await api("complaints/" + selected.id + "/review/", "POST", { status });
      await load(selected.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>ثبت شکایت</h1>
          <p>گزارش مشکل راننده، متصدی، کالا یا تأخیر، همراه با تصویر.</p>
        </div>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="tickets-layout">
        <section className="card ticket-list">
          {role === "owner" && (
            <form className="form-grid complaint-form" onSubmit={create}>
              <label>
                موضوع
                <select name="type" required defaultValue="">
                  <option value="">انتخاب کنید</option>
                  {Object.entries(complaintTypes).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                محموله مرتبط
                <select name="shipment" defaultValue="">
                  <option value="">بدون محموله</option>
                  {shipments.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.code} · {item.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="full">
                شرح شکایت
                <textarea name="description" required minLength={10} rows={4} />
              </label>
              <label className="full">
                تصاویر (حداکثر ۱۰)
                <input
                  name="photos"
                  type="file"
                  accept="image/jpeg,image/png"
                  multiple
                />
              </label>
              <button className="btn" disabled={busy}>
                {busy ? "در حال ثبت…" : "ثبت شکایت"}
              </button>
            </form>
          )}
          {items?.results.length ? (
            items.results.map((item) => (
              <button
                key={item.id}
                type="button"
                className={
                  "ticket-item " + (selected?.id === item.id ? "selected" : "")
                }
                onClick={() => setSelected(item)}
              >
                <div>
                  <b>{complaintTypes[item.type] || item.type}</b>
                  <Badge status={item.status} />
                </div>
                <p>
                  {item.user_name} · {date(item.created_at)}
                  {item.shipment_code ? " · " + item.shipment_code : ""}
                </p>
              </button>
            ))
          ) : (
            <Empty title="شکایتی ثبت نشده است" />
          )}
        </section>
        <section className="card conversation">
          {selected ? (
            <>
              <div className="card-head">
                <div>
                  <h2>{complaintTypes[selected.type] || selected.type}</h2>
                  <p>
                    {complaintStatuses[selected.status] || selected.status}
                    {selected.shipment_code
                      ? " · " + selected.shipment_code
                      : ""}
                  </p>
                </div>
              </div>
              <p>{selected.description}</p>
              {selected.photos.length > 0 && (
                <p>
                  {selected.photos.map((photo, index) => (
                    <a key={photo.id} href={photo.url}>
                      تصویر {index + 1}
                    </a>
                  ))}
                </p>
              )}
              {selected.messages.map((message) => (
                <div className="list-row" key={message.id}>
                  <div>
                    <b>{message.author_name || "پیام"}</b>
                    <p>{message.body}</p>
                  </div>
                </div>
              ))}
              {!["resolved", "rejected"].includes(selected.status) &&
                ["owner", "operator"].includes(role) && (
                  <form onSubmit={sendReply}>
                    <label className="full">
                      پیام
                      <textarea
                        value={reply}
                        rows={3}
                        onChange={(e) => setReply(e.target.value)}
                      />
                    </label>
                    <button className="btn" disabled={busy || !reply.trim()}>
                      ارسال پیام
                    </button>
                  </form>
                )}
              {role === "operator" && (
                <div className="shipment-actions">
                  {Object.entries(complaintStatuses).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      className="secondary-btn"
                      disabled={busy || selected.status === value}
                      onClick={() => void review(value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <Empty title="یک شکایت را انتخاب کنید" />
          )}
        </section>
      </div>
    </>
  );
}
