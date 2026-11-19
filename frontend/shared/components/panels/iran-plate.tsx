"use client";
import { useMemo, useState } from "react";

const LETTERS = [
  "ع",
  "الف",
  "ب",
  "پ",
  "ت",
  "ج",
  "د",
  "س",
  "ص",
  "ط",
  "ق",
  "ک",
  "ل",
  "م",
  "ن",
  "و",
  "ه",
  "ی",
  "ژ",
];

export type PlateParts = {
  part1: string;
  letter: string;
  part2: string;
  iran: string;
};

export function parsePlate(value: string): PlateParts {
  const match = String(value || "").match(
    /(\d{2})\s+(\S+)\s+(\d{3})\s+ایران\s+(\d{2})/,
  );
  if (!match) return { part1: "", letter: "ع", part2: "", iran: "" };
  return { part1: match[1], letter: match[2], part2: match[3], iran: match[4] };
}

export function formatPlate(parts: PlateParts) {
  if (!parts.part1 || !parts.letter || !parts.part2 || !parts.iran) return "";
  return `${parts.part1} ${parts.letter} ${parts.part2} ایران ${parts.iran}`;
}

export default function IranPlate({
  value,
  onChange,
}: {
  value: string;
  onChange: (plate: string) => void;
}) {
  const initial = useMemo(() => parsePlate(value), [value]);
  const [parts, setParts] = useState<PlateParts>(initial);
  function update(next: PlateParts) {
    setParts(next);
    onChange(formatPlate(next));
  }
  return (
    <div className="iran-plate" dir="ltr">
      <span className="plate-flag" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <input
        inputMode="numeric"
        maxLength={2}
        aria-label="دو رقم پلاک"
        value={parts.part1}
        onChange={(e) =>
          update({ ...parts, part1: e.target.value.replace(/\D/g, "").slice(0, 2) })
        }
      />
      <select
        aria-label={parts.letter === "ژ" ? "پلاک معلولین" : "حرف پلاک"}
        value={parts.letter}
        onChange={(e) => update({ ...parts, letter: e.target.value })}
      >
        {LETTERS.map((letter) => (
          <option key={letter} value={letter}>
            {letter === "ژ" ? "ژ (معلولین)" : letter}
          </option>
        ))}
      </select>
      <input
        inputMode="numeric"
        maxLength={3}
        aria-label="سه رقم پلاک"
        value={parts.part2}
        onChange={(e) =>
          update({ ...parts, part2: e.target.value.replace(/\D/g, "").slice(0, 3) })
        }
      />
      <label>
        ایران
        <input
          inputMode="numeric"
          maxLength={2}
          aria-label="کد ایران"
          value={parts.iran}
          onChange={(e) =>
            update({ ...parts, iran: e.target.value.replace(/\D/g, "").slice(0, 2) })
          }
        />
      </label>
    </div>
  );
}
