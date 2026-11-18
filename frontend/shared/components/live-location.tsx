"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError, type Location, type Shipment } from "@/lib/api";
import FleetMap from "./fleet-map";
export default function LiveLocation({
  shipment,
  canShare,
  onUpdate,
}: {
  shipment: Shipment;
  canShare: boolean;
  onUpdate?: () => void;
}) {
  const [points, setPoints] = useState(shipment.locations || []),
    [active, setActive] = useState(false),
    [message, setMessage] = useState(""),
    [loading, setLoading] = useState(false),
    [checkedAt, setCheckedAt] = useState(() => Date.now());
  const watch = useRef<number | null>(null),
    session = useRef(0),
    trackingSignal = useRef<AbortController | null>(null),
    last = useRef(0),
    pending = useRef<Record<string, number | string> | null>(null),
    sending = useRef(false);
  const clearTracking = useCallback(() => {
    session.current++;
    trackingSignal.current?.abort();
    trackingSignal.current = null;
    pending.current = null;
    last.current = 0;
    if (watch.current !== null) navigator.geolocation.clearWatch(watch.current);
    watch.current = null;
  }, []);
  const stop = useCallback(() => {
    clearTracking();
    setActive(false);
    setLoading(false);
    setMessage("اشتراک موقعیت متوقف شد.");
  }, [clearTracking]);
  useEffect(() => setPoints(shipment.locations || []), [shipment.locations]);
  useEffect(() => {
    if (!canShare && watch.current !== null) stop();
  }, [canShare, stop]);
  useEffect(() => {
    let mounted = true;
    const poll = setInterval(() => {
      setCheckedAt(Date.now());
      api<Shipment>("shipments/" + shipment.id + "/")
        .then((s) => {
          if (!mounted) return;
          setPoints(s.locations || []);
          if (s.status !== "in_transit" && watch.current !== null) {
            stop();
            setMessage("این سفر در مرحله حمل نیست؛ اشتراک موقعیت متوقف شد.");
          }
        })
        .catch((e) => {
          if (mounted)
            setMessage(
              "به‌روزرسانی موقعیت انجام نشد؛ آخرین زمان نمایش‌داده‌شده را بررسی کنید. " +
                (e as Error).message,
            );
        });
    }, 15000);
    return () => {
      mounted = false;
      clearInterval(poll);
      clearTracking();
    };
  }, [shipment.id, clearTracking, stop]);
  const send = useCallback(
    async function sendPending() {
      if (watch.current === null || !pending.current || sending.current) return;
      sending.current = true;
      const data = pending.current;
      const started = session.current;
      try {
        const saved = await api<Location>(
          "shipments/" + shipment.id + "/location/",
          "POST",
          data,
          trackingSignal.current?.signal,
        );
        if (started !== session.current) return;
        if (pending.current === data) pending.current = null;
        setPoints([saved]);
        setCheckedAt(Date.now());
        setMessage("موقعیت با موفقیت ثبت شد.");
      } catch (e) {
        if (started !== session.current) return;
        const retry =
          e instanceof ApiError &&
          (e.status === 0 || e.status >= 500 || e.status === 429);
        if (!retry && pending.current === data) pending.current = null;
        setMessage("ارسال موقعیت انجام نشد. " + (e as Error).message);
      } finally {
        sending.current = false;
        if (pending.current && pending.current !== data) void sendPending();
      }
    },
    [shipment.id],
  );
  useEffect(() => {
    const reconnect = () => void send();
    window.addEventListener("online", reconnect);
    return () => window.removeEventListener("online", reconnect);
  }, [send]);
  function start() {
    if (!navigator.geolocation) {
      setMessage("مرورگر از موقعیت مکانی پشتیبانی نمی‌کند.");
      return;
    }
    setLoading(true);
    setActive(true);
    setMessage("");
    trackingSignal.current = new AbortController();
    const started = ++session.current;
    watch.current = navigator.geolocation.watchPosition(
      (p) => {
        if (started !== session.current) return;
        setLoading(false);
        if (Date.now() - last.current < 15000) return;
        last.current = Date.now();
        pending.current = {
          latitude: p.coords.latitude.toFixed(6),
          longitude: p.coords.longitude.toFixed(6),
          accuracy: Math.round(p.coords.accuracy),
          observed_at: new Date(p.timestamp).toISOString(),
        };
        void send();
      },
      () => {
        if (started !== session.current) return;
        stop();
        setMessage(
          "دسترسی موقعیت مکانی دریافت نشد. مجوز مرورگر را بررسی کنید.",
        );
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 },
    );
  }
  const newest = points[0],
    stale =
      !newest ||
      checkedAt - new Date(newest.observed_at || newest.created_at).getTime() >
        300000;
  return (
    <section className="card detail-section">
      <div className="card-head">
        <h2>نقشه و رصد موقعیت راننده</h2>
        <span className={"badge " + (stale ? "pending" : "in_transit")}>
          {newest ? (stale ? "موقعیت قدیمی" : "به‌روز") : "بدون موقعیت"}
        </span>
      </div>
      <p className="muted">
        زمان و دقت آخرین موقعیت کنار نقشه نمایش داده می‌شود. ارسال موقعیت تا
        زمانی ادامه دارد که راننده اشتراک را فعال کرده باشد و صفحهٔ سفر روی
        دستگاه او باز و آنلاین باشد.
      </p>
      <FleetMap
        points={
          newest ? [{ ...newest, label: shipment.driver_name, stale }] : []
        }
      />
      {newest && (
        <p className="location-caption">
          <span dir="ltr">
            {newest.latitude}, {newest.longitude}
          </span>{" "}
          · اندازه‌گیری{" "}
          {new Date(newest.observed_at || newest.created_at).toLocaleString(
            "fa-IR",
          )}{" "}
          · دریافت {new Date(newest.created_at).toLocaleString("fa-IR")} · دقت{" "}
          {newest.accuracy} متر
        </p>
      )}
      {canShare && (
        <div className="tracking-controls">
          <p>
            با شروع رصد، موقعیت شما در همین سفر برای صاحب بار، متصدی و اپراتور
            ارسال می‌شود.
          </p>
          <button
            className={active ? "danger-btn" : "btn"}
            onClick={active ? stop : start}
          >
            {loading
              ? "لغو درخواست موقعیت"
              : active
                ? "توقف اشتراک موقعیت"
                : "شروع اشتراک موقعیت سفر"}
          </button>
        </div>
      )}
      {message && (
        <p className="info-note" role="status">
          {message}
        </p>
      )}
    </section>
  );
}
