"use client";
import "leaflet/dist/leaflet.css";
import { LocateFixed, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Pin = { lat: number; lng: number };
async function searchAddress(query: string) {
  const url =
    "https://nominatim.openstreetmap.org/search?format=json&countrycodes=ir&limit=5&accept-language=fa&q=" +
    encodeURIComponent(query);
  const response = await fetch(url);
  if (!response.ok) return [];
  return (await response.json()) as {
    display_name: string;
    lat: string;
    lon: string;
  }[];
}
async function reverseGeocode(lat: number, lng: number) {
  const url =
    "https://nominatim.openstreetmap.org/reverse?format=json&accept-language=fa&lat=" +
    lat +
    "&lon=" +
    lng;
  const response = await fetch(url);
  if (!response.ok) return null;
  const data = (await response.json()) as { display_name?: string };
  return data.display_name || null;
}

export default function LocationPicker({
  lat,
  lng,
  focus,
  placeholder,
  onPick,
}: {
  lat?: string;
  lng?: string;
  focus?: string;
  placeholder: string;
  onPick: (lat: number, lng: number, address: string | null) => void;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;
  const mapRef = useRef<{
    map: import("leaflet").Map;
    marker: import("leaflet").CircleMarker | null;
    L: typeof import("leaflet");
  } | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<
    { display_name: string; lat: string; lon: string }[]
  >([]);
  const [busy, setBusy] = useState("");

  async function choose(nextLat: number, nextLng: number) {
    onPickRef.current(nextLat, nextLng, null);
    const address = await reverseGeocode(nextLat, nextLng).catch(() => null);
    onPickRef.current(nextLat, nextLng, address);
    const current = mapRef.current;
    if (!current) return;
    if (!current.marker) {
      current.marker = current.L.circleMarker([nextLat, nextLng], {
        radius: 9,
        color: "#087f8c",
      }).addTo(current.map);
    } else current.marker.setLatLng([nextLat, nextLng]);
    current.map.flyTo([nextLat, nextLng], 15);
  }

  useEffect(() => {
    let alive = true;
    void import("leaflet").then((L) => {
      if (!alive || !holder.current || mapRef.current) return;
      const start: [number, number] =
        lat && lng ? [Number(lat), Number(lng)] : [35.6997, 51.338];
      const map = L.map(holder.current).setView(start, lat ? 15 : 11);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap",
      }).addTo(map);
      const marker =
        lat && lng
          ? L.circleMarker(start, { radius: 9, color: "#087f8c" }).addTo(map)
          : null;
      map.on("click", (event) => {
        void choose(event.latlng.lat, event.latlng.lng);
      });
      mapRef.current = { map, marker, L };
    });
    return () => {
      alive = false;
      mapRef.current?.map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!focus || (lat && lng)) return;
    const timer = setTimeout(() => {
      void searchAddress(focus + "، ایران").then((items) => {
        const first = items[0];
        if (!first || !mapRef.current) return;
        mapRef.current.map.flyTo([Number(first.lat), Number(first.lon)], 12);
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [focus]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim().length < 3) {
        setResults([]);
        return;
      }
      setBusy("search");
      void searchAddress(query)
        .then(setResults)
        .finally(() => setBusy(""));
    }, 450);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="map-picker">
      <div className="map-search">
        <Search size={15} />
        <input
          value={query}
          placeholder={placeholder}
          onChange={(event) => setQuery(event.target.value)}
        />
        <button
          type="button"
          className="secondary-btn"
          disabled={busy === "gps"}
          onClick={() => {
            if (!navigator.geolocation) return;
            setBusy("gps");
            navigator.geolocation.getCurrentPosition(
              (position) => {
                setBusy("");
                void choose(position.coords.latitude, position.coords.longitude);
              },
              () => setBusy(""),
              { timeout: 8000 },
            );
          }}
        >
          <LocateFixed size={15} />
          موقعیت فعلی
        </button>
      </div>
      {results.length > 0 && (
        <ul className="map-results">
          {results.map((item) => (
            <li key={item.lat + item.lon}>
              <button
                type="button"
                onClick={() => {
                  setQuery(item.display_name);
                  setResults([]);
                  void choose(Number(item.lat), Number(item.lon));
                }}
              >
                {item.display_name}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div ref={holder} className="map-canvas" />
    </div>
  );
}
