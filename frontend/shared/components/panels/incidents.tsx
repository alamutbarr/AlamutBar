"use client";
import { PanelError, usePanelRefresh } from "../panel-feedback";
import { useEffect, useState } from "react";
import { api, date, type Page, type Shipment, type Role } from "@/lib/api";
import { ActionForm } from "../forms";
import { Loading, Empty, Modal } from "../ui";
type Incident = {
  id: number;
  code: string;
  kind: string;
  severity: string;
  description: string;
  status: string;
  resolution: string;
  created_at: string;
};
const kinds: Record<string, string> = {
  delay: "تأخیر",
  breakdown: "خرابی خودرو",
  damage: "آسیب بار",
  shortage: "کسری بار",
  other: "سایر",
};
export default function Incidents({ role }: { role: Role }) {
  const [data, setData] = useState<Page<Incident> | null>(null),
    [shipments, setShipments] = useState<Shipment[]>([]),
    [modal, setModal] = useState<Incident | "new" | null>(null),
    [error, setError] = useState(""),
    [page, setPage] = useState(1);
  async function load() {
    try {
      setData(await api("incidents/?page=" + page));
      let url = "shipments/?" + (role === "driver" ? "mine=1" : "");
      const all: Shipment[] = [];
      do {
        const s = await api<Page<Shipment>>(url);
        all.push(...s.results);
        url = s.next
          ? new URL(s.next, "http://local").pathname +
            new URL(s.next, "http://local").search
          : "";
      } while (url && all.length < 300);
      setShipments(all);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  usePanelRefresh(load);
  useEffect(() => {
    void load();
  }, [page]);
  if (!data)
    return error ? (
      <PanelError error={error} retry={() => void load()} />
    ) : (
      <Loading />
    );
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>رخدادها و مغایرت‌های حمل</h1>
          <p>تأخیر، خرابی، آسیب و کسری بار با شرح اقدام اصلاحی</p>
        </div>
        <button className="btn" onClick={() => setModal("new")}>
          گزارش رخداد
        </button>
      </div>
      {error && <p className="error">{error}</p>}
      <section className="card">
        {data.results.length ? (
          data.results.map((i) => (
            <article className="notice incident" key={i.id}>
              <div>
                <b>
                  {i.code} · {kinds[i.kind]} ·{" "}
                  {i.severity === "critical" ? "بحرانی" : "عادی"}
                </b>
                <p>{i.description}</p>
                <small>
                  {date(i.created_at)} ·{" "}
                  {i.status === "resolved" ? "رفع شده" : "باز"}
                </small>
                {i.resolution && (
                  <p className="info-note">اقدام اصلاحی: {i.resolution}</p>
                )}
              </div>
              {role === "operator" && i.status !== "resolved" && (
                <button className="secondary-btn" onClick={() => setModal(i)}>
                  ثبت نتیجه و بستن
                </button>
              )}
            </article>
          ))
        ) : (
          <Empty title="رخدادی ثبت نشده است" />
        )}
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
            disabled={!data.next}
            onClick={() => setPage(page + 1)}
          >
            بعدی
          </button>
        </div>
      </section>
      {modal && (
        <Modal
          title={modal === "new" ? "ثبت رخداد" : "شرح اقدام اصلاحی"}
          onClose={() => setModal(null)}
        >
          <ActionForm
            fields={
              modal === "new"
                ? [
                    {
                      name: "shipment",
                      label: "محموله",
                      required: true,
                      full: true,
                      options: shipments.map((s) => ({
                        value: String(s.id),
                        label: s.code + " · " + s.title,
                      })),
                    },
                    {
                      name: "kind",
                      label: "نوع رخداد",
                      required: true,
                      options: Object.entries(kinds).map(([value, label]) => ({
                        value,
                        label,
                      })),
                    },
                    {
                      name: "severity",
                      label: "اهمیت",
                      value: "normal",
                      required: true,
                      options: [
                        { value: "normal", label: "عادی" },
                        {
                          value: "critical",
                          label: "بحرانی؛ توقف ادامه عملیات",
                        },
                      ],
                    },
                    {
                      name: "description",
                      label: "شرح دقیق رخداد",
                      type: "textarea",
                      required: true,
                      full: true,
                    },
                  ]
                : [
                    {
                      name: "resolution",
                      label: "اقدام اصلاحی و نتیجه",
                      type: "textarea",
                      required: true,
                      full: true,
                    },
                  ]
            }
            onSubmit={async (d) => {
              await api(
                modal === "new"
                  ? "incidents/"
                  : "incidents/" + modal.id + "/resolve/",
                "POST",
                d,
              );
              setModal(null);
              await load();
            }}
          />
        </Modal>
      )}
    </>
  );
}
