"use client";
import { api, date, money, number, statuses, urgencies, vehicles, type Shipment } from "@/lib/api";
import Link from "@/lib/navigation";
import { MapPin, Navigation, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Empty, Loading } from "../ui";

type City = { province: string; name: string };
type Mode = "list" | "nearby" | "manual";

function remaining(iso?: string | null) {
  if (!iso) return "";
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "منقضی شد";
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${number(hours)} ساعت`;
  return `${number(Math.max(minutes, 1))} دقیقه`;
}

export default function DriverDesk({
  initialTab,
  base,
  section = "shipments",
  onChanged,
}: {
  initialTab: "offered" | "active" | "history";
  base: string;
  section?: string;
  onChanged?: () => void;
}) {
  const [tab, setTab] = useState(initialTab);
  const [mode, setMode] = useState<Mode>("list");
  const [rows, setRows] = useState<Shipment[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [cities, setCities] = useState<City[]>([]);
  const [province, setProvince] = useState("");
  const [band, setBand] = useState(50);
  const [geoNote, setGeoNote] = useState("");

  useEffect(() => {
    setTab(initialTab);
    setMode("list");
  }, [initialTab]);

  useEffect(() => {
    let ignore = false;
    api<{ cities: City[] }>("places/")
      .then((data) => {
        if (!ignore) setCities(data.cities);
      })
      .catch(() => undefined);
    return () => {
      ignore = true;
    };
  }, []);

  async function loadList(next = tab) {
    setError("");
    setRows(null);
    try {
      const page = await api<{ results: Shipment[] }>("shipments/?tab=" + next);
      setRows(page.results);
    } catch (e) {
      setError((e as Error).message);
      setRows([]);
    }
  }

  useEffect(() => {
    if (mode === "list") void loadList(tab);
  }, [tab, mode]);

  async function act(id: number, action: "accept" | "decline") {
    setBusy(String(id) + action);
    setError("");
    try {
      await api("shipments/" + id + "/" + action + "/", "POST", {});
      onChanged?.();
      if (mode === "list") await loadList(tab);
      else setRows((current) => (current || []).filter((row) => row.id !== id));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }

  async function manualSearch(event: React.FormEvent) {
    event.preventDefault();
    setRows(null);
    try {
      const data = await api<Shipment[]>(
        "shipments/route-search/?origin=" +
          encodeURIComponent(origin) +
          "&destination=" +
          encodeURIComponent(destination),
      );
      setRows(data);
    } catch (e) {
      setError((e as Error).message);
      setRows([]);
    }
  }

  function nearby() {
    if (!navigator.geolocation) {
      setGeoNote("مرورگر شما از موقعیت مکانی پشتیبانی نمی‌کند.");
      return;
    }
    setGeoNote("در حال دریافت موقعیت مکانی...");
    setRows(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const params = new URLSearchParams({
          lat: String(position.coords.latitude),
          lng: String(position.coords.longitude),
          band: String(band),
          destination: province,
        });
        api<Shipment[]>("shipments/nearby/?" + params.toString())
          .then((data) => {
            setRows(data);
            setGeoNote(
              data.length
                ? "مبدأ فعلی شما، تا " + number(band) + " کیلومتر"
                : "باری در این محدوده پیدا نشد",
            );
          })
          .catch((e) => {
            setError((e as Error).message);
            setRows([]);
          });
      },
      () => {
        setGeoNote("اجازه دسترسی به موقعیت مکانی داده نشد.");
        setRows([]);
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  const provinces = Array.from(new Set(cities.map((city) => city.province)));
  return (
    <section className="driver-desk">
      <div className="segmented" role="tablist" aria-label="مأموریت‌ها">
        {(
          [
            ["offered", "پیشنهادها"],
            ["active", "فعال"],
            ["history", "سوابق"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            className={tab === key ? "active" : ""}
            onClick={() => {
              setTab(key);
              setMode("list");
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "offered" && (
        <div className="search-entry">
          <button type="button" className={mode === "nearby" ? "btn" : "secondary-btn"} onClick={() => setMode("nearby")}>
            بارهای اطراف من
          </button>
          <button type="button" className={mode === "manual" ? "btn" : "secondary-btn"} onClick={() => setMode("manual")}>
            جست‌وجوی دستی
          </button>
        </div>
      )}
      {mode === "nearby" && tab === "offered" && (
        <div className="card form-card">
          <h2>بارهای اطراف من</h2>
          <p className="muted">بر اساس موقعیت فعلی شما، از نزدیک‌ترین باند تا پوشش گسترده‌تر.</p>
          <label>
            استان مقصد (اختیاری)
            <input list="provinces" value={province} onChange={(e) => setProvince(e.target.value)} placeholder="انتخاب استان مقصد..." />
            <datalist id="provinces">
              {provinces.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
          </label>
          <div className="wizard-actions">
            {[50, 100, 200, 500].map((item) => (
              <button key={item} type="button" className={band === item ? "btn" : "secondary-btn"} onClick={() => setBand(item)}>
                تا {number(item)} کیلومتر
              </button>
            ))}
          </div>
          <button className="btn" type="button" onClick={nearby}>
            فعال‌سازی موقعیت مکانی
          </button>
          {geoNote && <p className="info-note">{geoNote}</p>}
        </div>
      )}
      {mode === "manual" && tab === "offered" && (
        <form className="card form-card" onSubmit={manualSearch}>
          <h2>جست‌وجوی دستی</h2>
          <label>
            مبدأ
            <input list="cities" value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="انتخاب مبدأ..." />
          </label>
          <label>
            مقصد
            <input list="cities" value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="انتخاب مقصد..." />
          </label>
          <datalist id="cities">
            {cities.map((city) => (
              <option key={city.province + city.name} value={city.name}>
                {city.province}
              </option>
            ))}
          </datalist>
          <button className="btn" type="submit">
            <Search size={16} /> نمایش بارهای مسیر
          </button>
        </form>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {rows === null ? (
        <Loading />
      ) : rows.length === 0 ? (
        <Empty
          title={
            tab === "offered"
              ? "پیشنهاد مأموریت جدیدی نیست"
              : tab === "active"
                ? "مأموریت فعالی ندارید"
                : "سابقه‌ای موجود نیست"
          }
          text={
            tab === "offered"
              ? "پیشنهادهای جدید در اینجا نمایش داده می‌شوند."
              : tab === "active"
                ? "مأموریت‌های در حال انجام اینجا نمایش داده می‌شوند."
                : "مأموریت‌های پایان‌یافته و لغوشده در اینجا نمایش داده می‌شوند."
          }
        />
      ) : (
        <div className="mission-list">
          {rows.map((mission) => (
            <article className="card mission-card" key={mission.id}>
              <div className="card-head">
                <div>
                  <b dir="ltr">{mission.code}</b>
                  <p>{mission.title}</p>
                </div>
                <span className={"badge " + mission.status}>{statuses[mission.status] || mission.status}</span>
              </div>
              <p className="table-route">
                <MapPin size={16} /> {mission.origin}
                <Navigation size={16} /> {mission.destination}
                {mission.destination_locked ? " (محدود)" : ""}
              </p>
              <p className="muted">
                {vehicles[mission.vehicle_type]} · {number(mission.weight)} تن · {date(mission.pickup_date)}
                {mission.route_km ? " · " + number(mission.route_km) + " کیلومتر" : ""}
                {mission.distance_km ? " · " + number(mission.distance_km) + " کیلومتر تا شما" : ""}
              </p>
              <p>
                <strong>{money(mission.price)}</strong>
                {mission.sensitive && <span className="badge pending">حساس</span>}
                {mission.urgency === "urgent" && (
                  <span className="badge cancelled">{urgencies.urgent}</span>
                )}
                {mission.offer_expires_at && mission.status === "approved" && (
                  <span className="badge pending">{remaining(mission.offer_expires_at)}</span>
                )}
              </p>
              <div className="wizard-actions">
                <Link className="secondary-btn" href={base + "/" + section + "/" + mission.id}>
                  جزئیات
                </Link>
                {mission.status === "approved" && (
                  <>
                    <button className="btn" disabled={!!busy} onClick={() => void act(mission.id, "accept")}>
                      قبول مأموریت
                    </button>
                    <button className="danger-btn" disabled={!!busy} onClick={() => void act(mission.id, "decline")}>
                      رد پیشنهاد
                    </button>
                  </>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
