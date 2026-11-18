"use client";
import { api, date, type Page } from "@/lib/api";
import type { ModalState, Mutate, Ticket } from "@/lib/workspace-types";
import { ChevronRight, Plus } from "lucide-react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { ActionForm } from "../forms";
import { Badge, Empty } from "../ui";
export default function Support({
  tickets,
  ticket,
  setTicket,
  pager,
  setModal,
  mutate,
  load,
}: {
  tickets: Page<Ticket>;
  ticket: Ticket | null;
  setTicket: Dispatch<SetStateAction<Ticket | null>>;
  pager: (count: number) => ReactNode;
  setModal: Dispatch<SetStateAction<ModalState | undefined>>;
  mutate: Mutate;
  load: () => Promise<void>;
}) {
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>گفت‌وگو، تا حل مسئله.</h1>
          <p>درخواست‌های پشتیبانی و پاسخ تیم عملیات</p>
        </div>
        <button className="btn" onClick={() => setModal({ kind: "ticket" })}>
          <Plus size={18} />
          تیکت جدید
        </button>
      </div>
      <div className={"tickets-layout" + (ticket ? " conversation-open" : "")}>
        <section className="card ticket-list">
          {tickets.results.length ? (
            tickets.results.map((t) => (
              <button
                key={t.id}
                className={
                  "ticket-item " + (ticket?.id === t.id ? "selected" : "")
                }
                onClick={() => setTicket(t)}
              >
                <div>
                  <b>{t.subject}</b>
                  <Badge status={t.status} />
                </div>
                <p>
                  {t.user_name} · {date(t.created_at)}{" "}
                  {t.priority === "urgent" ? "· فوری" : ""}
                </p>
              </button>
            ))
          ) : (
            <Empty title="درخواستی ندارید" />
          )}
          {pager(tickets.count)}
        </section>
        <section className="card conversation">
          {ticket ? (
            <>
              <div className="card-head">
                <div>
                  <button
                    type="button"
                    className="text-link ticket-back"
                    onClick={() => setTicket(null)}
                  >
                    <ChevronRight size={18} />
                    فهرست گفت‌وگوها
                  </button>
                  <h2>{ticket.subject}</h2>
                </div>
                {ticket.status === "open" && (
                  <button
                    className="secondary-btn"
                    onClick={async () => {
                      if (await mutate("tickets/" + ticket.id + "/close/", {}))
                        setTicket({ ...ticket, status: "closed" });
                    }}
                  >
                    بستن تیکت
                  </button>
                )}
              </div>
              <div className="messages">
                {ticket.messages.map((m) => (
                  <article
                    key={m.id}
                    className={
                      "message " + (m.role === "operator" ? "staff" : "")
                    }
                  >
                    <div>
                      <b>{m.author_name}</b>
                      <small>{date(m.created_at)}</small>
                    </div>
                    <p>{m.body}</p>
                  </article>
                ))}
              </div>
              {ticket.status === "open" ? (
                <ActionForm
                  fields={[
                    {
                      name: "body",
                      label: "پاسخ شما",
                      type: "textarea",
                      required: true,
                      full: true,
                      maxLength: 4000,
                    },
                  ]}
                  submit="ارسال پاسخ"
                  onSubmit={async (data) => {
                    const t = await api<Ticket>(
                      "tickets/" + ticket.id + "/reply/",
                      "POST",
                      data,
                    );
                    setTicket(t);
                    await load();
                  }}
                />
              ) : (
                <p className="info-note">
                  این گفت‌وگو بسته شده است. برای موضوع جدید تیکت ثبت کنید.
                </p>
              )}
            </>
          ) : (
            <Empty
              title="یک گفت‌وگو را انتخاب کنید"
              text="پاسخ‌ها و تاریخچه درخواست، اینجا نمایش داده می‌شود."
            />
          )}
        </section>
      </div>
    </>
  );
}
