// frontend/src/driver/missionSearch/LocationAutocomplete.jsx
//
// فیلد Autocomplete مشترک برای انتخاب مبدأ/مقصد در «جست‌وجوی دستی».
// رفتار:
// - روی اولین کلیک (بدون تایپ): فقط فهرست استان‌ها (Dropdown با ارتفاع محدود
//   و اسکرول داخلی).
// - با تایپ: جست‌وجوی هم‌زمان استان + شهر از بک‌اند (debounce، بدون درخواست
//   مکرر هنگام تایپ سریع).
// - انتخاب شهر هم‌نام: نام استان همراه شهر نمایش داده می‌شود تا ابهامی نباشد.
// - مقدار انتخاب‌شده بر اساس شناسه (city.id یا province.id) نگه داشته می‌شود،
//   نه فقط رشته‌ی متنی.

import { useEffect, useRef, useState, useCallback } from 'react';
import { MapPin, Building2, X, Loader2 } from 'lucide-react';
import { fetchProvinces, searchLocationsApi } from './api';

const DEBOUNCE_MS = 300;

/**
 * value shape: null | { type: 'province', id, name } | { type: 'city', id, name, province, provinceId }
 */
export function LocationAutocomplete({ label, value, onChange, placeholder = 'انتخاب کنید...' }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [provinces, setProvinces] = useState([]);
  const [searchResult, setSearchResult] = useState({ provinces: [], cities: [] });
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);
  const containerRef = useRef(null);

  // بارگذاری فهرست کامل استان‌ها فقط یک‌بار (برای حالت بدون تایپ)
  useEffect(() => {
    let cancelled = false;
    fetchProvinces()
      .then((list) => {
        if (!cancelled) setProvinces(list);
      })
      .catch(() => {
        if (!cancelled) setProvinces([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // بستن Dropdown هنگام کلیک خارج از کامپوننت
  useEffect(() => {
    function handleOutsideClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const runSearch = useCallback((text) => {
    clearTimeout(debounceRef.current);
    if (!text.trim()) {
      setSearchResult({ provinces: [], cities: [] });
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const result = await searchLocationsApi(text.trim());
        setSearchResult(result);
      } catch {
        setSearchResult({ provinces: [], cities: [] });
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);
  }, []);

  const handleFocus = () => {
    setOpen(true);
  };

  const handleQueryChange = (e) => {
    const text = e.target.value;
    setQuery(text);
    runSearch(text);
  };

  const handleSelectProvince = (province) => {
    onChange({ type: 'province', id: province.id, name: province.name });
    setQuery('');
    setSearchResult({ provinces: [], cities: [] });
    setOpen(false);
  };

  const handleSelectCity = (city) => {
    onChange({
      type: 'city',
      id: city.id,
      name: city.name,
      province: city.province,
      provinceId: city.provinceId,
    });
    setQuery('');
    setSearchResult({ provinces: [], cities: [] });
    setOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange(null);
    setQuery('');
    setSearchResult({ provinces: [], cities: [] });
  };

  const isTyping = query.trim().length > 0;
  const listProvinces = isTyping ? searchResult.provinces : provinces;
  const listCities = isTyping ? searchResult.cities : [];
  const hasNoResults = isTyping && !loading && listProvinces.length === 0 && listCities.length === 0;

  return (
    <div ref={containerRef} className="relative">
      <label className="mb-1.5 block text-xs font-medium text-slate-500">{label}</label>

      <div
        onClick={() => {
          setOpen(true);
        }}
        className="flex items-center gap-2 rounded-xl border border-white/60 bg-white/55 px-3 py-2.5 cursor-text transition focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500/20"
      >
        {value?.type === 'province' ? (
          <Building2 className="w-4 h-4 text-blue-500 shrink-0" />
        ) : (
          <MapPin className="w-4 h-4 text-emerald-500 shrink-0" />
        )}

        {!open && value ? (
          <span className="flex-1 truncate text-sm font-medium text-slate-800">
            {value.type === 'city' ? `${value.name} — استان ${value.province}` : `استان ${value.name}`}
          </span>
        ) : (
          <input
            type="text"
            value={query}
            onFocus={handleFocus}
            onChange={handleQueryChange}
            placeholder={value ? (value.type === 'city' ? `${value.name} — استان ${value.province}` : `استان ${value.name}`) : placeholder}
            className="flex-1 min-w-0 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
          />
        )}

        {loading && <Loader2 className="w-4 h-4 shrink-0 animate-spin text-slate-400" />}
        {value && !loading && (
          <button type="button" onClick={handleClear} className="shrink-0 text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {open && (
        <div className="glass-strong anim-pop absolute z-40 mt-1.5 w-full max-h-64 overflow-y-auto rounded-xl shadow-lg">
          {!isTyping && (
            <p className="px-3 pt-2.5 pb-1 text-[11px] font-medium text-slate-400">استان‌ها</p>
          )}

          {listProvinces.length > 0 && (
            <ul>
              {listProvinces.map((p) => (
                <li key={`prov-${p.id}`}>
                  <button
                    type="button"
                    onClick={() => handleSelectProvince(p)}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-right text-sm text-slate-700 transition hover:bg-white/70"
                  >
                    <Building2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span className="font-medium">استان {p.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {listCities.length > 0 && (
            <>
              <p className="px-3 pt-2 pb-1 text-[11px] font-medium text-slate-400 border-t border-slate-100">
                شهرها
              </p>
              <ul>
                {listCities.map((c) => (
                  <li key={`city-${c.id}`}>
                    <button
                      type="button"
                      onClick={() => handleSelectCity(c)}
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-right text-sm text-slate-700 transition hover:bg-white/70"
                    >
                      <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>
                        <span className="font-medium">{c.name}</span>
                        <span className="text-slate-400"> — استان {c.province}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}

          {hasNoResults && (
            <p className="px-3 py-4 text-center text-sm text-slate-400">نتیجه‌ای پیدا نشد</p>
          )}
        </div>
      )}
    </div>
  );
}
