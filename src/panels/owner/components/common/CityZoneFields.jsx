import SearchableSelect from "./SearchableSelect";

export default function CityZoneFields({
  cityLabel,
  zoneLabel,
  cityRequired = true,
  zoneRequired = false,
  cityValue,
  zoneValue,
  cityOptions = [],
  zoneOptions = [],
  cityPlaceholder = "جستجوی نام شهر...",
  zonePlaceholder = "انتخاب محدوده",
  onCityChange,
  onZoneChange,
  cityDisabled = false,
  zoneDisabled = false,
  cityNoResults = "شهری با این مشخصات یافت نشد",
  zoneNoResults = "محدوده‌ای برای این شهر یافت نشد",
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm font-medium text-ink-700">
        <span>
          {cityLabel}
          {cityRequired && <span className="text-[#087f8c]"> *</span>}
        </span>
        <span className="text-ink-400">
          {zoneLabel}
          {zoneRequired && <span className="text-[#087f8c]"> *</span>}
        </span>
      </div>
      <div className="flex overflow-hidden rounded-lg border border-ink-100 bg-white focus-within:border-[#087f8c] focus-within:ring-2 focus-within:ring-[#087f8c]/25">
        <div className="min-w-0 flex-1">
          <SearchableSelect
            embedded
            accent="teal"
            disabled={cityDisabled}
            value={cityValue}
            options={cityOptions}
            placeholder={cityPlaceholder}
            onChange={onCityChange}
            noResultsText={cityNoResults}
          />
        </div>
        <div className="w-px shrink-0 self-stretch bg-ink-100" />
        <div className="min-w-0 flex-1">
          <SearchableSelect
            embedded
            accent="teal"
            disabled={zoneDisabled}
            value={zoneValue}
            options={zoneOptions}
            placeholder={zonePlaceholder}
            onChange={onZoneChange}
            noResultsText={zoneNoResults}
          />
        </div>
      </div>
    </div>
  );
}
