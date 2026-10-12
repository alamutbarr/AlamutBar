import React, { useState, useRef, useEffect } from "react";

// حرف «ع» اولین گزینهٔ فهرست است و نماد «♿» نیز حفظ شده است
const PLATE_LETTERS = [
  "ع",
  "ب",
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
  "♿",
];

export function IranianPlateInput({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // بستن منو در صورت کلیک در بیرون از آن
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleChange = (part, val) => {
    if (part !== "letter" && !/^\d*$/.test(val)) return;
    onChange({ ...value, [part]: val });
  };

  const selectLetter = (letter) => {
    handleChange("letter", letter);
    setIsOpen(false);
  };

  return (
    // حذف overflow-hidden برای جلوگیری از بریده شدن منوی کشویی و اعمال relative
    <div
      className="flex w-full items-center justify-between rounded-xl border-2 border-slate-300 bg-white h-14 relative"
      dir="ltr"
    >
      {/* پرچم ایران - سمت چپ (انحنای گوشه‌ها به صورت دستی اعمال شد) */}
      <div className="h-full bg-blue-600 w-10 flex flex-col items-center justify-center text-white text-[10px] font-bold shrink-0 rounded-l-[10px]">
        <div className="w-5 h-3 flex flex-col mb-1 border border-white/20">
          <div className="h-1 bg-green-500 w-full"></div>
          <div className="h-1 bg-white w-full"></div>
          <div className="h-1 bg-red-500 w-full"></div>
        </div>
        I.R
        <br />
        IRAN
      </div>

      {/* دو رقم */}
      <input
        type="text"
        maxLength={2}
        value={value?.part1 || ""}
        onChange={(e) => handleChange("part1", e.target.value)}
        className="w-12 h-full text-center text-xl font-bold focus:outline-none focus:bg-blue-50 transition-colors"
        placeholder="12"
      />

      {/* انتخاب حرف (Dropdown اختصاصی) */}
      <div
        className="h-full w-14 border-x border-slate-200 relative flex items-center justify-center bg-transparent hover:bg-blue-50 transition-colors"
        ref={dropdownRef}
      >
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full h-full flex items-center justify-center text-xl font-bold focus:outline-none text-slate-800"
        >
          {value?.letter || "-"}
        </button>

        {isOpen && (
          <div
            className="absolute top-full mt-1 w-16 bg-white border border-slate-200 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto left-1/2 -translate-x-1/2"
            dir="rtl"
          >
            {PLATE_LETTERS.map((l) => (
              <button
                key={l}
                type="button"
                title={l === "♿" ? "پلاک معلولین" : l}
                aria-label={l === "♿" ? "پلاک معلولین" : `حرف ${l}`}
                onClick={(e) => {
                  e.preventDefault();
                  selectLetter(l);
                }}
                className={`w-full text-center py-2 text-lg font-bold hover:bg-blue-50 transition-colors ${
                  value?.letter === l
                    ? "bg-blue-100 text-blue-700"
                    : "text-slate-700"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* سه رقم */}
      <input
        type="text"
        maxLength={3}
        value={value?.part2 || ""}
        onChange={(e) => handleChange("part2", e.target.value)}
        className="w-16 h-full text-center text-xl font-bold focus:outline-none focus:bg-blue-50 transition-colors"
        placeholder="345"
      />

      {/* کد ایران (انحنای گوشه‌ها به صورت دستی اعمال شد) */}
      <div className="h-full flex flex-col border-l-2 border-slate-300 w-14 shrink-0 bg-slate-50 rounded-r-[10px]">
        <span className="text-[10px] text-center font-bold text-slate-500 pt-1">
          ایران
        </span>
        <input
          type="text"
          maxLength={2}
          value={value?.iranCode || ""}
          onChange={(e) => handleChange("iranCode", e.target.value)}
          className="w-full flex-1 text-center text-lg font-bold bg-transparent focus:outline-none focus:bg-blue-100 transition-colors"
          placeholder="67"
        />
      </div>
    </div>
  );
}
