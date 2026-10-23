import { useEffect, useRef, useState, useCallback } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Search, MapPin, LocateFixed, Loader2 } from "lucide-react";

// آیکن پیش‌فرض Leaflet با باندلرهایی مثل Vite به‌درستی لود نمی‌شود؛
// این یک راه‌حل شناخته‌شده است: آدرس آیکن‌ها را از CDN می‌دهیم
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const TEHRAN = { lat: 35.6997, lng: 51.338 };

// سرویس رایگان OpenStreetMap برای جست‌وجو و تبدیل مختصات به آدرس (بدون نیاز به کلید API)
async function searchAddress(query) {
  if (!query || query.trim().length < 3) return [];
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
    query,
  )}&countrycodes=ir&limit=5&accept-language=fa`;
  const res = await fetch(url);
  if (!res.ok) return [];
  return res.json();
}

async function reverseGeocode(lat, lng) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=fa`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  return data?.display_name || null;
}

function ClickHandler({ onPick }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function FlyToOnChange({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position)
      map.flyTo([position.lat, position.lng], 15, { duration: 0.8 });
  }, [position?.lat, position?.lng]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

export default function LocationPicker({
  lat,
  lng,
  onPick,
  placeholder = "جست‌وجوی آدرس یا نام محل...",
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const debounceRef = useRef(null);

  const position = lat && lng ? { lat: Number(lat), lng: Number(lng) } : null;

  const handlePick = useCallback(
    async (newLat, newLng) => {
      onPick(newLat, newLng, null); // فوری مختصات را ست می‌کنیم، آدرس کمی بعد می‌رسد
      const address = await reverseGeocode(newLat, newLng);
      onPick(newLat, newLng, address);
    },
    [onPick],
  );

  const handleQueryChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    clearTimeout(debounceRef.current);
    if (value.trim().length < 3) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const items = await searchAddress(value);
      setResults(items);
      setSearching(false);
    }, 500);
  };

  const handleSelectResult = (item) => {
    setQuery(item.display_name);
    setResults([]);
    handlePick(Number(item.lat), Number(item.lon));
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        handlePick(pos.coords.latitude, pos.coords.longitude);
        setLocating(false);
      },
      () => setLocating(false),
      { timeout: 8000 },
    );
  };

  return (
    <div className="relative z-0 overflow-hidden rounded-xl border border-ink-100">
      <div className="relative border-b border-ink-100 bg-white p-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search
              size={15}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-300"
            />
            <input
              value={query}
              onChange={handleQueryChange}
              placeholder={placeholder}
              className="w-full rounded-lg border border-ink-100 bg-route-bg py-2 pr-9 pl-3 text-sm text-ink-900 placeholder:text-ink-300 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
            />
            {searching && (
              <Loader2
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 animate-spin text-ink-300"
              />
            )}
          </div>
          <button
            type="button"
            onClick={handleUseMyLocation}
            title="موقعیت فعلی من"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-ink-100 text-ink-500 transition-colors hover:border-amber-400 hover:text-amber-600"
          >
            {locating ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <LocateFixed size={16} />
            )}
          </button>
        </div>

        {results.length > 0 && (
          <ul className="absolute inset-x-2 top-full z-[1000] mt-1 max-h-56 overflow-y-auto rounded-lg border border-ink-100 bg-white shadow-panel-lg">
            {results.map((r) => (
              <li key={r.place_id}>
                <button
                  type="button"
                  onClick={() => handleSelectResult(r)}
                  className="flex w-full items-start gap-2 px-3 py-2.5 text-right text-xs text-ink-600 transition-colors hover:bg-amber-50"
                >
                  <MapPin
                    size={14}
                    className="mt-0.5 shrink-0 text-amber-500"
                  />
                  <span className="leading-5">{r.display_name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="h-64 w-full">
        <MapContainer
          center={position || TEHRAN}
          zoom={position ? 15 : 11}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onPick={handlePick} />
          <FlyToOnChange position={position} />
          {position && (
            <Marker
              position={[position.lat, position.lng]}
              draggable
              eventHandlers={{
                dragend: (e) => {
                  const { lat: newLat, lng: newLng } = e.target.getLatLng();
                  handlePick(newLat, newLng);
                },
              }}
            />
          )}
        </MapContainer>
      </div>

      <p className="flex items-center gap-1.5 border-t border-ink-100 bg-route-bg px-3 py-2 text-[11px] text-ink-300">
        <MapPin size={12} />
        روی نقشه کلیک کن یا نشانگر را جابه‌جا کن؛ آدرس به‌صورت خودکار پیدا
        می‌شود.
      </p>
    </div>
  );
}
