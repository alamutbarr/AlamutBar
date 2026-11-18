"use client";
import { useEffect, useId, useState } from "react";
const formatter = new Intl.DateTimeFormat("en-US-u-ca-persian-nu-latn", {
  year: "numeric",
  month: "numeric",
  day: "numeric",
  timeZone: "UTC",
});
export function persianParts(date: Date) {
  const p = Object.fromEntries(
    formatter.formatToParts(date).map((v) => [v.type, v.value]),
  );
  return { year: Number(p.year), month: Number(p.month), day: Number(p.day) };
}
export function persianToISO(year: number, month: number, day: number) {
  if (!year || !month || !day) return "";
  let lo = Math.floor(Date.UTC(year + 621, 0, 1) / 86400000),
    hi = Math.floor(Date.UTC(year + 622, 11, 31) / 86400000);
  const target = year * 372 + month * 31 + day;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2),
      date = new Date(mid * 86400000 + 43200000),
      p = persianParts(date),
      value = p.year * 372 + p.month * 31 + p.day;
    if (value === target) return date.toISOString().slice(0, 10);
    if (value < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return "";
}
const months = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];
export default function PersianDate({
  name,
  label,
  value,
  required,
  onChange,
}: {
  name: string;
  label: string;
  value?: string | number;
  required?: boolean;
  onChange?: (value: string) => void;
}) {
  const now = persianParts(new Date()),
    parsed = value
      ? persianParts(new Date(String(value) + "T12:00:00Z"))
      : null;
  const [year, setYear] = useState(parsed?.year || 0),
    [month, setMonth] = useState(parsed?.month || 0),
    [day, setDay] = useState(parsed?.day || 0);
  const id = useId();
  const days =
    month <= 6 ? 31 : month < 12 ? 30 : persianToISO(year, 12, 30) ? 30 : 29;
  useEffect(() => {
    if (day > days) setDay(0);
  }, [days, day]);
  function choose(next: { year?: number; month?: number; day?: number }) {
    const nextYear = next.year ?? year;
    const nextMonth = next.month ?? month;
    const nextDay = next.day ?? day;
    if (next.year !== undefined) setYear(next.year);
    if (next.month !== undefined) setMonth(next.month);
    if (next.day !== undefined) setDay(next.day);
    const iso = persianToISO(nextYear, nextMonth, nextDay);
    if (iso) onChange?.(iso);
  }
  const min = name === "birth_date" ? now.year - 100 : now.year - 1,
    max = name === "birth_date" ? now.year - 18 : now.year + 20,
    years = Array.from({ length: max - min + 1 }, (_, i) => max - i);
  return (
    <fieldset className="persian-date">
      <legend>
        {label.replace(" (میلادی)", "")} {required ? "*" : ""}
      </legend>
      <div>
        <select
          aria-label={label + " روز"}
          value={day || ""}
          required={required}
          onChange={(e) => choose({ day: Number(e.target.value) })}
        >
          <option value="">روز</option>
          {Array.from({ length: days }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {(i + 1).toLocaleString("fa-IR")}
            </option>
          ))}
        </select>
        <select
          aria-label={label + " ماه"}
          value={month || ""}
          required={required}
          onChange={(e) => choose({ month: Number(e.target.value) })}
        >
          <option value="">ماه</option>
          {months.map((m, i) => (
            <option value={i + 1} key={m}>
              {m}
            </option>
          ))}
        </select>
        <select
          aria-label={label + " سال"}
          value={year || ""}
          required={required}
          onChange={(e) => choose({ year: Number(e.target.value) })}
        >
          <option value="">سال</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y.toLocaleString("fa-IR", { useGrouping: false })}
            </option>
          ))}
        </select>
      </div>
      <input type="hidden" name={name} value={persianToISO(year, month, day)} />
      <small>تقویم شمسی · ذخیره استاندارد تاریخ در سامانه</small>
    </fieldset>
  );
}
