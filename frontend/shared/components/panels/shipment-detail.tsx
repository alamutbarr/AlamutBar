"use client";
import {
  date,
  money,
  number,
  statuses,
  vehicles,
  type Role,
  type Shipment,
  type User,
} from "@/lib/api";
import type { ModalState, Mutate } from "@/lib/workspace-types";
import {
  ArrowLeft,
  ArrowUpLeft,
  Check,
  ChevronLeft,
  Download,
  FileText,
  MapPin,
  Paperclip,
  ShieldCheck,
  Truck,
} from "lucide-react";
import Link from "@/lib/navigation";
import type { Dispatch, SetStateAction } from "react";
import { Badge, Empty } from "../ui";
import LiveLocation from "../live-location";
export default function ShipmentDetail({
  shipment,
  user,
  role,
  backHref,
  busy,
  setBusy,
  setToast,
  setModal,
  mutate,
}: {
  shipment: Shipment;
  user: User | null;
  role: Role;
  backHref: string;
  busy: boolean;
  setBusy: Dispatch<SetStateAction<boolean>>;
  setToast: Dispatch<SetStateAction<string>>;
  setModal: Dispatch<SetStateAction<ModalState | undefined>>;
  mutate: Mutate;
}) {
  const loadingReady = shipment.inspections?.find(
    (i) => i.stage === "loading",
  )?.passed;
  const deliveryReady = shipment.inspections?.find(
    (i) => i.stage === "delivery",
  )?.passed;
  return (
    <>
      <div className="page-heading shipment-heading">
        <div>
          <Link className="text-link small desktop-back" href={backHref}>
            بازگشت به فهرست
            <ChevronLeft size={14} />
          </Link>
          <h1>{shipment.title}</h1>
          <p>
            <span dir="ltr">{shipment.code}</span> · ثبت در{" "}
            {date(shipment.created_at)}
          </p>
        </div>
        <Badge status={shipment.status} />
      </div>
      <div className="detail-layout">
        <div>
          <section className="card shipment-detail">
            <div className="big-route">
              <div>
                <MapPin size={22} />
                <small>مبدأ</small>
                <h2>{shipment.origin}</h2>
              </div>
              <div className="route-dash">
                <Truck size={24} />
              </div>
              <div>
                <MapPin size={22} />
                <small>مقصد</small>
                <h2>{shipment.destination}</h2>
              </div>
            </div>
            <dl className="detail-grid">
              {[
                ["نوع خودرو", vehicles[shipment.vehicle_type]],
                ["وزن بار", number(shipment.weight) + " تن"],
                ["تاریخ بارگیری", date(shipment.pickup_date)],
                ["کرایه", money(shipment.price)],
                ["ارزش کالا", money(shipment.cargo_value)],
                ["صاحب بار", shipment.owner_name || "پس از تخصیص"],
                ["راننده", shipment.driver_name || "هنوز تخصیص نیافته"],
                ["متصدی", shipment.inspector_name || "هنوز تخصیص نیافته"],
                [
                  "نشانی مبدأ",
                  shipment.origin_address || "پس از تخصیص در دسترس است",
                ],
                [
                  "نشانی مقصد",
                  shipment.destination_address || "پس از تخصیص در دسترس است",
                ],
                ["گیرنده", shipment.recipient_name || "—"],
                ["موبایل گیرنده", shipment.recipient_phone || "—"],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
            {shipment.notes && <p className="info-note">{shipment.notes}</p>}
            {((shipment.status === "loading" && !loadingReady) ||
              (shipment.status === "delivered" && !deliveryReady)) && (
              <p className="info-note">
                ادامه این مرحله به تأیید بازرسی{" "}
                {shipment.status === "loading" ? "بارگیری" : "تحویل"} توسط متصدی
                نیاز دارد.
              </p>
            )}
            <div className="shipment-actions">
              {role === "operator" && shipment.status === "pending" && (
                <button
                  className="btn"
                  disabled={busy}
                  onClick={() =>
                    mutate("shipments/" + shipment.id + "/transition/", {
                      status: "approved",
                    })
                  }
                >
                  <Check size={17} />
                  تأیید درخواست
                </button>
              )}
              {role === "operator" && shipment.status === "approved" && (
                <button
                  className="btn"
                  onClick={() => setModal({ kind: "assign", data: shipment })}
                >
                  <Truck size={17} />
                  تخصیص راننده و متصدی
                </button>
              )}
              {["owner", "operator"].includes(role) &&
                shipment.status === "pending" && (
                  <button
                    className="secondary-btn"
                    onClick={() => setModal({ kind: "edit", data: shipment })}
                  >
                    ویرایش درخواست
                  </button>
                )}
              {role === "driver" && shipment.status === "approved" && (
                <button
                  className="btn"
                  onClick={() => setModal({ kind: "offer", data: shipment })}
                >
                  ثبت پیشنهاد کرایه
                </button>
              )}
              {(role === "operator" ||
                (role === "driver" && shipment.driver === user?.id)) &&
                ["assigned", "loading", "in_transit"].includes(
                  shipment.status,
                ) && (
                  <button
                    className="btn"
                    disabled={
                      busy || (shipment.status === "loading" && !loadingReady)
                    }
                    onClick={() =>
                      mutate("shipments/" + shipment.id + "/transition/", {
                        status: (
                          {
                            assigned: "loading",
                            loading: "in_transit",
                            in_transit: "delivered",
                          } as Record<string, string>
                        )[shipment.status],
                      })
                    }
                  >
                    {
                      (
                        {
                          assigned: "شروع بارگیری",
                          loading: "شروع حرکت",
                          in_transit: "ثبت رسیدن و تحویل",
                        } as Record<string, string>
                      )[shipment.status]
                    }
                    <ArrowLeft size={17} />
                  </button>
                )}
              {role === "inspector" &&
                ["loading", "delivered"].includes(shipment.status) && (
                  <button
                    className="btn"
                    onClick={() =>
                      setModal({ kind: "inspect", data: shipment })
                    }
                  >
                    <ShieldCheck size={17} />
                    ثبت بازرسی{" "}
                    {shipment.status === "loading" ? "بارگیری" : "تحویل"}
                  </button>
                )}
              {["owner", "operator"].includes(role) &&
                shipment.status === "delivered" && (
                  <button
                    className="btn"
                    disabled={busy || !deliveryReady}
                    onClick={() =>
                      mutate("shipments/" + shipment.id + "/transition/", {
                        status: "completed",
                      })
                    }
                  >
                    تأیید نهایی و صدور صورتحساب
                  </button>
                )}
              {["owner", "operator"].includes(role) &&
                [
                  "pending",
                  "approved",
                  ...(role === "operator" ? ["assigned"] : []),
                ].includes(shipment.status) && (
                  <button
                    className="danger-btn"
                    onClick={() => setModal({ kind: "cancel", data: shipment })}
                  >
                    لغو درخواست
                  </button>
                )}
            </div>
          </section>
          {Boolean(shipment.offers?.length) && (
            <section className="card detail-section">
              <h2>پیشنهادهای حمل</h2>
              {shipment.offers.map((o) => (
                <div className="list-row" key={o.id}>
                  <div>
                    <b>{o.driver_name}</b>
                    <p>{o.note || "آماده هماهنگی حمل"}</p>
                  </div>
                  <strong>{money(o.amount)}</strong>
                </div>
              ))}
            </section>
          )}
          <section className="card detail-section">
            <div className="card-head">
              <h2>اسناد و پیوست‌ها</h2>
              {(role !== "driver" || shipment.driver === user?.id) && (
                <label className="secondary-btn upload-btn">
                  <Paperclip size={16} /> افزودن سند
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    className="sr-only"
                    disabled={busy}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const data = new FormData();
                      data.set("file", file);
                      await mutate(
                        "shipments/" + shipment.id + "/documents/",
                        data,
                      );
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
            </div>
            <p className="muted small">
              PDF، PNG یا JPG · حداکثر ۱۰ مگابایت · دریافت فقط برای افراد مرتبط
              با محموله
            </p>
            {shipment.documents?.length ? (
              <div className="documents">
                {shipment.documents.map((d) => (
                  <a href={d.url} key={d.id}>
                    <FileText size={22} />
                    <span>{d.name}</span>
                    <Download size={17} />
                  </a>
                ))}
              </div>
            ) : (
              <Empty
                title="هنوز سندی بارگذاری نشده"
                text="رسید، بارنامه یا تصویر محموله را اینجا نگه دارید."
              />
            )}
          </section>
          <LiveLocation
            key={shipment.id}
            shipment={shipment}
            canShare={
              role === "driver" &&
              shipment.driver === user?.id &&
              shipment.status === "in_transit"
            }
          />
          <section className="card detail-section">
            <h2>گزارش‌های بازرسی</h2>
            {shipment.inspections?.length ? (
              shipment.inspections.map((i) => (
                <div className="inspection-row" key={i.id}>
                  <ShieldCheck size={24} />
                  <div>
                    <b>
                      {i.stage === "loading" ? "بارگیری" : "تحویل"} ·{" "}
                      {i.passed ? "تأیید سلامت" : "نیازمند اصلاح"}
                    </b>
                    <p>
                      پلمب: {i.seal_number} · {date(i.created_at)}
                    </p>
                    <p>{i.notes}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="muted">
                گزارشی ثبت نشده است. حرکت و تأیید نهایی به بازرسی موفق نیاز
                دارند.
              </p>
            )}
          </section>
        </div>
        <aside className="card timeline-card">
          <h2>داستان این مسیر</h2>
          <p className="muted small">تمام تغییرات با نام ثبت‌کننده</p>
          <ol className="timeline">
            {shipment.events?.map((e, i) => (
              <li
                key={e.id}
                className={i === shipment.events.length - 1 ? "latest" : ""}
              >
                <i />
                <b>{statuses[e.status]}</b>
                <p>{e.note}</p>
                <small>
                  {e.actor_name} · {date(e.created_at)}
                </small>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </>
  );
}
