"use client";
import {
  date,
  handlingMethods,
  money,
  number,
  pickupWindows,
  statuses,
  urgencies,
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
import { useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import { Badge, Empty } from "../ui";
import LiveLocation from "../live-location";
import DriverTrip from "./driver-trip";
import ShipmentChat from "./shipment-chat";
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
  const [driverScore, setDriverScore] = useState(0);
  const [inspectorScore, setInspectorScore] = useState(0);
  const [comment, setComment] = useState("");
  const dimensions = [shipment.length_m, shipment.width_m, shipment.height_m]
    .filter((part) => part)
    .map((part) => number(part || 0))
    .join(" × ");
  const facts: [string, string][] = [
    ["نوع خودرو", vehicles[shipment.vehicle_type]],
    ["نوع کالا", shipment.cargo_type],
    ["بسته‌بندی", shipment.packaging],
    ["وزن بار", number(shipment.weight) + " تن"],
    [
      "تعداد بسته",
      shipment.package_count ? number(shipment.package_count) : "",
    ],
    ["ابعاد (متر)", dimensions],
    ["تاریخ بارگیری", date(shipment.pickup_date)],
    ["فوریت", urgencies[shipment.urgency] || ""],
    ["بازه بارگیری", pickupWindows[shipment.pickup_window] || ""],
    ["روش بارگیری", handlingMethods[shipment.loading_method] || ""],
    ["روش تخلیه", handlingMethods[shipment.unloading_method] || ""],
    ["کرایه", money(shipment.price)],
    ["ارزش کالا", money(shipment.cargo_value)],
    ["بیمه بار", shipment.insurance_requested ? "درخواست شده" : ""],
    ["صاحب بار", shipment.owner_name || "پس از تخصیص"],
    ["راننده", shipment.driver_name || "هنوز تخصیص نیافته"],
    ["متصدی", shipment.inspector_name || "هنوز تخصیص نیافته"],
    ["نشانی مبدأ", shipment.origin_address || "پس از تخصیص در دسترس است"],
    ["نشانی مقصد", shipment.destination_locked
      ? "آدرس دقیق پس از صدور بارنامه نمایش داده می‌شود."
      : shipment.destination_address || "پس از تخصیص در دسترس است"],
    ["گیرنده", shipment.recipient_name || "—"],
    ["موبایل گیرنده", shipment.recipient_phone || "—"],
    ["کد ملی گیرنده", shipment.recipient_national_id || ""],
    ["کد پستی گیرنده", shipment.recipient_postal_code || ""],
  ];
  const canRate =
    role === "owner" &&
    ["delivered", "completed"].includes(shipment.status) &&
    !shipment.rating;
  function sendRating(event: FormEvent) {
    event.preventDefault();
    if (!driverScore) return;
    void mutate(
      "shipments/" + shipment.id + "/rate/",
      {
        driver_score: driverScore,
        inspector_score: inspectorScore || null,
        comment,
      },
      "امتیاز این مأموریت ثبت شد.",
    );
  }
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
              {facts
                .filter(([, value]) => value)
                .map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
            </dl>
            {shipment.rating && (
              <p className="info-note">
                امتیاز راننده {number(shipment.rating.driver_score)} از ۵
                {shipment.rating.inspector_score
                  ? " · امتیاز متصدی " +
                    number(shipment.rating.inspector_score) +
                    " از ۵"
                  : ""}
                {shipment.rating.comment ? " · " + shipment.rating.comment : ""}
              </p>
            )}
            {canRate && (
              <form className="rating-form" onSubmit={sendRating}>
                <h2>امتیاز این مأموریت</h2>
                <label>
                  امتیاز راننده
                  <select
                    value={driverScore}
                    onChange={(e) => setDriverScore(Number(e.target.value))}
                    required
                  >
                    <option value={0}>انتخاب کنید</option>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {number(n)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  امتیاز متصدی (اختیاری)
                  <select
                    value={inspectorScore}
                    onChange={(e) => setInspectorScore(Number(e.target.value))}
                  >
                    <option value={0}>بدون امتیاز</option>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {number(n)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="full">
                  نظر شما
                  <textarea
                    value={comment}
                    maxLength={1000}
                    rows={3}
                    onChange={(e) => setComment(e.target.value)}
                  />
                </label>
                <button className="btn" disabled={busy || !driverScore}>
                  ثبت امتیاز
                </button>
              </form>
            )}
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
                <>
                  <button
                    className="btn"
                    disabled={busy}
                    onClick={() =>
                      void mutate("shipments/" + shipment.id + "/accept/", {})
                    }
                  >
                    قبول مأموریت
                  </button>
                  <button
                    className="danger-btn"
                    disabled={busy}
                    onClick={() =>
                      void mutate("shipments/" + shipment.id + "/decline/", {})
                    }
                  >
                    رد پیشنهاد
                  </button>
                </>
              )}
              {role === "operator" &&
                ["assigned", "loading", "in_transit"].includes(shipment.status) && (
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
              {role === "operator" &&
                ["arrived_pickup", "loading", "waybill"].includes(shipment.status) && (
                  <>
                    <button
                      className="secondary-btn"
                      disabled={busy}
                      onClick={async () => {
                        const saved = (await mutate(
                          "shipments/" + shipment.id + "/waybill-issue/",
                          {},
                          "کد بارنامه صادر شد.",
                        )) as { code?: string } | false;
                        if (saved && saved.code)
                          setToast("کد بارنامه: " + saved.code);
                      }}
                    >
                      صدور کد بارنامه
                    </button>
                    <label className="secondary-btn upload-btn">
                      عکس بارنامه
                      <input
                        className="sr-only"
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const data = new FormData();
                          data.set("file", file);
                          await mutate(
                            "shipments/" + shipment.id + "/waybill-photo/",
                            data,
                          );
                          e.target.value = "";
                        }}
                      />
                    </label>
                    {shipment.waybill?.code && (
                      <p className="info-note">
                        کد بارنامه: <b dir="ltr">{shipment.waybill.code}</b>
                      </p>
                    )}
                  </>
                )}
              {role === "inspector" &&
                ["loading", "arrived_pickup", "delivered", "near_destination"].includes(
                  shipment.status,
                ) && (
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
          {role === "driver" && shipment.driver === user?.id && (
            <DriverTrip
              shipment={shipment}
              busy={busy}
              mutate={mutate}
              supportPhone={undefined}
            />
          )}
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
              ["waybill", "in_transit", "near_destination"].includes(shipment.status)
            }
          />
          {shipment.driver && ["driver", "operator"].includes(role) && shipment.status !== "approved" && (
            <ShipmentChat shipmentId={shipment.id} />
          )}
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
