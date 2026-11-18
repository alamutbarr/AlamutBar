"use client";
import { api } from "@/lib/api";
import { Send } from "lucide-react";
import { useEffect, useState } from "react";

type Note = {
  id: number;
  body: string;
  created_at: string;
  author_name: string;
  role: string;
  mine: boolean;
};

export default function ShipmentChat({ shipmentId }: { shipmentId: number }) {
  const [rows, setRows] = useState<Note[]>([]);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");

  async function load() {
    try {
      setRows(await api<Note[]>("shipments/" + shipmentId + "/messages/"));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 15000);
    return () => clearInterval(timer);
  }, [shipmentId]);

  return (
    <section className="card detail-section">
      <h2>گفت‌وگوی همین سفر</h2>
      <div className="chat-log">
        {rows.length ? (
          rows.map((item) => (
            <p key={item.id} className={item.mine ? "mine" : ""}>
              <b>{item.author_name}</b>
              <span>{item.body}</span>
              <small>{new Date(item.created_at).toLocaleString("fa-IR")}</small>
            </p>
          ))
        ) : (
          <p className="muted">پیامی ثبت نشده است.</p>
        )}
      </div>
      <form
        className="chat-form"
        onSubmit={(event) => {
          event.preventDefault();
          const text = body.trim();
          if (!text) return;
          void api("shipments/" + shipmentId + "/messages/", "POST", { body: text })
            .then(() => {
              setBody("");
              return load();
            })
            .catch((e) => setError((e as Error).message));
        }}
      >
        <input
          value={body}
          maxLength={1000}
          aria-label="پیام برای اپراتور"
          placeholder="پیام خود را بنویسید"
          onChange={(e) => setBody(e.target.value)}
        />
        <button className="btn" type="submit" aria-label="ارسال پیام">
          <Send size={16} />
        </button>
      </form>
      {error && <p className="error">{error}</p>}
    </section>
  );
}
