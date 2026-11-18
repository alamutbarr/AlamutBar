"use client";
import { PanelError, usePanelRefresh } from "../panel-feedback";
import { useEffect, useState } from "react";
import { api, date, number, type Page } from "@/lib/api";
import { ActionForm } from "../forms";
import { Modal, Empty, Loading } from "../ui";
type StaffMember = { id: number; first_name: string; last_name: string };
type Lead = {
  id: number;
  name: string;
  company: string;
  phone: string;
  stage: string;
  description: string;
  assigned_to: number | null;
  assigned_name: string;
  activities: {
    id: number;
    kind: string;
    body: string;
    actor_name: string;
    created_at: string;
  }[];
};
type Task = {
  id: number;
  title: string;
  due_at: string;
  done: boolean;
  lead_name: string;
  assigned_to: number;
};
const stages: Record<string, string> = {
  new: "جدید",
  qualified: "نیازسنجی",
  proposal: "پیشنهاد ارسال شده",
  won: "تبدیل به مشتری",
  lost: "از دست رفته",
};
export default function CRM() {
  const [leads, setLeads] = useState<Page<Lead> | null>(null),
    [tasks, setTasks] = useState<Page<Task> | null>(null),
    [staff, setStaff] = useState<StaffMember[]>([]),
    [stage, setStage] = useState(""),
    [q, setQ] = useState(""),
    [page, setPage] = useState(1),
    [selected, setSelected] = useState<Lead | null>(null),
    [modal, setModal] = useState(""),
    [error, setError] = useState(""),
    [taskPage, setTaskPage] = useState(1);
  async function load() {
    try {
      const [l, t, c] = await Promise.all([
        api<Page<Lead>>(
          "crm/leads/?q=" +
            encodeURIComponent(q) +
            "&stage=" +
            stage +
            "&page=" +
            page,
        ),
        api<Page<Task>>("crm/followups/?page=" + taskPage),
        api<StaffMember[]>("crm/staff/"),
      ]);
      setLeads(l);
      setTasks(t);
      setStaff(c);
      if (selected) {
        setSelected(await api("crm/leads/" + selected.id + "/"));
      }
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  usePanelRefresh(load);
  useEffect(() => {
    void load();
  }, [stage, page, taskPage]);
  const options = staff.map((s) => ({
    value: String(s.id),
    label: s.first_name + " " + s.last_name,
  }));
  if (!leads)
    return error ? (
      <PanelError error={error} retry={() => void load()} />
    ) : (
      <Loading />
    );
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">مدیریت ارتباط با مشتری</span>
          <h1>از اولین تماس تا همکاری.</h1>
          <p>درخواست‌های سایت، سرنخ‌ها، تاریخچه تماس و پیگیری‌های تیم</p>
        </div>
        <div className="shipment-actions">
          <button className="btn" onClick={() => setModal("lead")}>
            سرنخ جدید
          </button>
          <button className="secondary-btn" onClick={() => setModal("task")}>
            پیگیری جدید
          </button>
        </div>
      </div>
      {error && <p className="error">{error}</p>}
      <div className="crm-stage-tabs">
        <button
          className={!stage ? "active" : ""}
          onClick={() => {
            setStage("");
            setPage(1);
          }}
        >
          همه
        </button>
        {Object.entries(stages).map(([key, label]) => (
          <button
            className={stage === key ? "active" : ""}
            key={key}
            onClick={() => {
              setStage(key);
              setPage(1);
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <section className="card">
        <form
          className="list-toolbar"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            void load();
          }}
        >
          <input
            placeholder="جست‌وجوی نام، شرکت یا شماره"
            aria-label="جستجوی CRM"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button className="secondary-btn">جستجو</button>
        </form>
        <div className="table-wrap app-records">
          <table role="table" aria-label="مشتریان و سرنخ‌ها">
            <thead role="rowgroup">
              <tr role="row">
                <th role="columnheader" scope="col">
                  مشتری / شرکت
                </th>
                <th role="columnheader" scope="col">
                  شماره تماس
                </th>
                <th role="columnheader" scope="col">
                  مرحله
                </th>
                <th role="columnheader" scope="col">
                  مسئول
                </th>
                <th role="columnheader" scope="col">
                  عملیات
                </th>
              </tr>
            </thead>
            <tbody role="rowgroup">
              {leads.results.map((l) => (
                <tr role="row" key={l.id}>
                  <td role="cell">
                    <b>{l.name}</b>
                    <small className="block muted">{l.company || "—"}</small>
                  </td>
                  <td role="cell" data-label="شماره تماس">
                    <a href={"tel:" + l.phone} dir="ltr">
                      {l.phone}
                    </a>
                  </td>
                  <td role="cell" data-label="مرحله">
                    <span className="badge">{stages[l.stage]}</span>
                  </td>
                  <td role="cell" data-label="مسئول">
                    {l.assigned_name || "تخصیص نیافته"}
                  </td>
                  <td role="cell" data-actions="true">
                    <button
                      className="text-link"
                      onClick={() => setSelected(l)}
                    >
                      پرونده و تماس‌ها
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!leads.results.length && (
          <Empty
            title="سرنخی پیدا نشد"
            text="درخواست‌های جدید فرم سایت نیز به‌صورت خودکار وارد CRM می‌شوند."
          />
        )}
        <div className="pagination">
          <span>
            {number(leads.count)} سرنخ · صفحه {number(page)}
          </span>
          <div>
            <button
              className="secondary-btn"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              قبلی
            </button>
            <button
              className="secondary-btn"
              disabled={!leads.next}
              onClick={() => setPage(page + 1)}
            >
              بعدی
            </button>
          </div>
        </div>
      </section>
      <section className="card form-card detail-section">
        <h2>کارها و پیگیری‌ها</h2>
        {tasks?.results.map((t) => (
          <div className="notice" key={t.id}>
            <div>
              <b>{t.title}</b>
              <small>
                {t.lead_name} · سررسید{" "}
                {new Date(t.due_at).toLocaleString("fa-IR")}
              </small>
            </div>
            <span
              className={
                "badge " +
                (t.done
                  ? "completed"
                  : new Date(t.due_at) < new Date()
                    ? "cancelled"
                    : "pending")
              }
            >
              {t.done
                ? "انجام شده"
                : new Date(t.due_at) < new Date()
                  ? "عقب‌افتاده"
                  : "برنامه‌ریزی شده"}
            </span>
            <button
              className="secondary-btn"
              onClick={async () => {
                try {
                  await api("crm/followups/" + t.id + "/", "PATCH", {
                    done: !t.done,
                  });
                  await load();
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              {t.done ? "بازگشایی" : "انجام شد"}
            </button>
          </div>
        ))}
        {!tasks?.count && <Empty title="پیگیری ثبت نشده است" />}
        <div className="pagination">
          <span>صفحه {number(taskPage)}</span>
          <button
            className="secondary-btn"
            disabled={taskPage === 1}
            onClick={() => setTaskPage(taskPage - 1)}
          >
            قبلی
          </button>
          <button
            className="secondary-btn"
            disabled={!tasks?.next}
            onClick={() => setTaskPage(taskPage + 1)}
          >
            بعدی
          </button>
        </div>
      </section>
      {modal && (
        <Modal
          title={modal === "lead" ? "سرنخ جدید" : "برنامه‌ریزی پیگیری"}
          onClose={() => setModal("")}
        >
          <ActionForm
            fields={
              modal === "lead"
                ? [
                    { name: "name", label: "نام مخاطب", required: true },
                    {
                      name: "phone",
                      label: "موبایل",
                      type: "tel",
                      required: true,
                    },
                    { name: "company", label: "شرکت" },
                    { name: "assigned_to", label: "مسئول", options },
                    {
                      name: "description",
                      label: "نیاز و توضیحات",
                      type: "textarea",
                      full: true,
                    },
                  ]
                : [
                    {
                      name: "title",
                      label: "موضوع پیگیری",
                      required: true,
                      full: true,
                    },
                    {
                      name: "assigned_to",
                      label: "مسئول",
                      options,
                      required: true,
                    },
                    {
                      name: "due_at",
                      label: "سررسید",
                      type: "datetime-local",
                      required: true,
                    },
                    {
                      name: "lead",
                      label: "سرنخ مرتبط (اختیاری)",
                      options: leads.results.map((l) => ({
                        value: String(l.id),
                        label: l.name,
                      })),
                    },
                  ]
            }
            onSubmit={async (d) => {
              const values = Object.fromEntries(
                Object.entries(d).filter(([, v]) => v !== ""),
              );
              await api(
                modal === "lead" ? "crm/leads/" : "crm/followups/",
                "POST",
                {
                  ...values,
                  ...(d.due_at
                    ? { due_at: new Date(d.due_at).toISOString() }
                    : {}),
                },
              );
              setModal("");
              await load();
            }}
          />
        </Modal>
      )}
      {selected && (
        <Modal
          wide
          title={"پرونده " + selected.name}
          onClose={() => setSelected(null)}
        >
          <p className="info-note">
            {selected.description || "توضیحی ثبت نشده است."}
          </p>
          <ActionForm
            key={selected.id + "details"}
            fields={[
              {
                name: "stage",
                label: "مرحله همکاری",
                value: selected.stage,
                options: Object.entries(stages).map(([value, label]) => ({
                  value,
                  label,
                })),
                required: true,
              },
              {
                name: "assigned_to",
                label: "مسئول پرونده",
                value: selected.assigned_to || "",
                options,
              },
            ]}
            submit="ذخیره وضعیت"
            onSubmit={async (d) => {
              await api("crm/leads/" + selected.id + "/", "PATCH", {
                stage: d.stage,
                assigned_to: d.assigned_to || null,
              });
              await load();
            }}
          />
          <h3>ثبت تماس و یادداشت</h3>
          <ActionForm
            fields={[
              {
                name: "kind",
                label: "نوع ارتباط",
                value: "call",
                options: [
                  { value: "call", label: "تماس" },
                  { value: "note", label: "یادداشت" },
                  { value: "meeting", label: "جلسه" },
                ],
                required: true,
              },
              {
                name: "body",
                label: "شرح ارتباط و نتیجه",
                type: "textarea",
                full: true,
                required: true,
              },
            ]}
            submit="ثبت ارتباط"
            onSubmit={async (d) => {
              await api("crm/leads/" + selected.id + "/activity/", "POST", d);
              await load();
            }}
          />
          <div className="messages">
            {selected.activities.map((a) => (
              <article className="message" key={a.id}>
                <b>
                  {a.actor_name} · {date(a.created_at)}
                </b>
                <p>{a.body}</p>
              </article>
            ))}
          </div>
        </Modal>
      )}
    </>
  );
}
