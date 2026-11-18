import { useEffect, useState } from "react";
import api from "../../api/axios.config";

export default function SupportTickets() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ subject: "", priority: "normal", body: "" });
  const [reply, setReply] = useState({});

  const load = () => api.get("/support-tickets").then((response) => setRows(response.data.data || []));

  useEffect(() => {
    load().catch((err) => setError(err.response?.data?.message || "فهرست پشتیبانی بارگذاری نشد."));
  }, []);

  if (error) return <p className="p-6 text-red-600">{error}</p>;
  if (!rows) return <p className="p-6">در حال بارگذاری...</p>;

  return (
    <div className="p-4 md:p-6" dir="rtl">
      <h1 className="text-xl font-bold mb-4">پشتیبانی</h1>
      <form className="grid gap-2 mb-6" onSubmit={async (event) => {
        event.preventDefault();
        try {
          await api.post("/support-tickets", form);
          setForm({ subject: "", priority: "normal", body: "" });
          await load();
        } catch (err) {
          setError(err.response?.data?.message || "ثبت درخواست ناموفق بود.");
        }
      }}>
        <input className="border rounded p-2" placeholder="موضوع" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required />
        <select className="border rounded p-2" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
          <option value="normal">عادی</option>
          <option value="urgent">فوری</option>
        </select>
        <textarea className="border rounded p-2" placeholder="شرح درخواست" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} required />
        <button className="bg-teal-700 text-white rounded p-2" type="submit">ثبت درخواست</button>
      </form>
      {rows.map((ticket) => (
        <article key={ticket.id} className="border rounded p-4 mb-3 bg-white">
          <strong>{ticket.subject}</strong>
          <span className="text-sm text-slate-500"> — {ticket.priority === "urgent" ? "فوری" : "عادی"} — {ticket.status === "closed" ? "بسته" : "باز"}</span>
          {(ticket.messages || []).map((message) => <p key={message.id}>{message.authorName}: {message.body}</p>)}
          {ticket.status !== "closed" && (
            <div className="flex gap-2 mt-2">
              <input className="border rounded p-2 flex-1" placeholder="پاسخ" value={reply[ticket.id] || ""} onChange={(e) => setReply({ ...reply, [ticket.id]: e.target.value })} />
              <button type="button" className="border rounded px-3" onClick={async () => {
                await api.post(`/support-tickets/${ticket.id}/replies`, { body: reply[ticket.id] });
                await load();
              }}>ارسال</button>
            </div>
          )}
        </article>
      ))}
      {rows.length === 0 && <p className="text-slate-500">درخواست پشتیبانی ندارید.</p>}
    </div>
  );
}
