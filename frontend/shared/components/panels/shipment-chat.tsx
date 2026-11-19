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

export default function ShipmentChat({
  shipmentId,
  role,
}: {
  shipmentId: number;
  role: "owner" | "driver" | "operator" | "inspector";
}) {
  const [rows, setRows] = useState<Note[]>([]);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");

  const [channel, setChannel] = useState(
    role === "driver" ? "driver_operator" : "owner_operator",
  );

  async function load() {
    try {
      setRows(
        await api<Note[]>(
          "shipments/" + shipmentId + "/messages/?channel=" + channel,
        ),
      );
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 15000);
    return () => clearInterval(timer);
  }, [shipmentId, channel]);

  return (
    <section className="card detail-section">
      <h2>
        {channel === "driver_operator" ? "گفتگوی اپراتور و راننده" : "گفتگوی اپراتور و صاحب بار"}
      </h2>
      {role === "operator" && (
        <div className="wizard-actions">
          <button
            type="button"
            className={channel === "owner_operator" ? "btn" : "secondary-btn"}
            onClick={() => setChannel("owner_operator")}
          >
            صاحب بار
          </button>
          <button
            type="button"
            className={channel === "driver_operator" ? "btn" : "secondary-btn"}
            onClick={() => setChannel("driver_operator")}
          >
            راننده
          </button>
        </div>
      )}
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
          void api("shipments/" + shipmentId + "/messages/", "POST", {
            body: text,
            channel,
          })
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
