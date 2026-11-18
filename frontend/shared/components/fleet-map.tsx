"use client";
import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
export type MapPoint = {
  latitude: string | number;
  longitude: string | number;
  label?: string;
  created_at?: string;
  observed_at?: string;
  accuracy?: number;
  stale?: boolean;
};
export default function FleetMap({
  points,
  height = 360,
}: {
  points: MapPoint[];
  height?: number;
}) {
  const el = useRef<HTMLDivElement>(null),
    map = useRef<import("leaflet").Map | null>(null),
    layer = useRef<import("leaflet").LayerGroup | null>(null),
    leaflet = useRef<typeof import("leaflet") | null>(null),
    fitted = useRef(false);
  const [ready, setReady] = useState(false),
    [error, setError] = useState("");
  function focus() {
    const L = leaflet.current;
    if (!L || !map.current) return;
    const coords = points
      .filter(
        (p) =>
          Number.isFinite(Number(p.latitude)) &&
          Number.isFinite(Number(p.longitude)),
      )
      .map(
        (p) =>
          [
            Number(p.latitude),
            Number(p.longitude),
          ] as import("leaflet").LatLngTuple,
      );
    if (coords.length === 1) map.current.setView(coords[0], 12);
    else if (coords.length > 1)
      map.current.fitBounds(L.latLngBounds(coords), {
        padding: [35, 35],
        maxZoom: 12,
      });
  }
  useEffect(() => {
    let disposed = false;
    import("leaflet")
      .then((L) => {
        if (disposed || !el.current) return;
        leaflet.current = L;
        map.current = L.map(el.current, { scrollWheelZoom: false }).setView(
          [32.4, 53.7],
          5,
        );
        layer.current = L.layerGroup().addTo(map.current);
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        })
          .on("tileerror", () => {
            if (!disposed)
              setError(
                "بخشی از نقشه بارگیری نشد؛ مختصات و زمان ثبت همچنان در دسترس‌اند.",
              );
          })
          .addTo(map.current);
        setReady(true);
        requestAnimationFrame(() => map.current?.invalidateSize());
      })
      .catch(() => setError("بارگیری نقشه انجام نشد."));
    return () => {
      disposed = true;
      map.current?.remove();
      map.current = null;
    };
  }, []);
  useEffect(() => {
    const L = leaflet.current;
    if (!ready || !L || !layer.current) return;
    layer.current.clearLayers();
    for (const p of points) {
      const lat = Number(p.latitude),
        lng = Number(p.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      const popup = document.createElement("div");
      popup.dir = "rtl";
      popup.textContent =
        (p.label || "موقعیت راننده") +
        (p.created_at
          ? " · " +
            new Date(p.observed_at || p.created_at).toLocaleString("fa-IR")
          : "");
      L.circleMarker([lat, lng], {
        radius: 9,
        color: p.stale ? "#b58b3e" : "#087f8c",
        fillOpacity: 0.9,
      })
        .bindPopup(popup)
        .addTo(layer.current);
    }
    if (points.length && !fitted.current) {
      focus();
      fitted.current = true;
    }
  }, [points, ready]);
  return (
    <div className="map-shell">
      <div
        ref={el}
        style={{ height }}
        aria-label="نقشه موقعیت ثبت‌شده رانندگان"
        role="region"
      />
      {points.length > 0 && (
        <button className="secondary-btn map-focus" onClick={focus}>
          تمرکز روی موقعیت‌ها
        </button>
      )}
      {!points.length && (
        <p className="map-empty">
          هنوز موقعیت واقعی دریافت نشده است؛ نشانگر ساختگی نمایش داده نمی‌شود.
        </p>
      )}
      {error && (
        <p className="info-note" role="status">
          {error}
        </p>
      )}
    </div>
  );
}
