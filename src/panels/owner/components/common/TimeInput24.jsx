import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Clock, ChevronDown } from "lucide-react";

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));

const selectClass =
  "tabular flex h-10 w-[4.5rem] items-center justify-between rounded-lg border border-ink-100 bg-white px-2 text-sm text-ink-900 transition-colors focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40";

function HourSelect({ value, onChange, isOpen, onToggle, onClose }) {
  const rootRef = useRef(null);
  const listRef = useRef(null);
  const selectedRef = useRef(null);
  const [dropdownStyle, setDropdownStyle] = useState(null);

  useEffect(() => {
    if (!isOpen) {
      setDropdownStyle(null);
      return undefined;
    }

    const updateDropdownPosition = () => {
      const anchor = rootRef.current?.getBoundingClientRect();
      if (!anchor) return;

      const gap = 4;
      const viewportPadding = 8;
      const spaceBelow =
        window.innerHeight - anchor.bottom - gap - viewportPadding;
      const spaceAbove = anchor.top - gap - viewportPadding;
      const openAbove = spaceBelow < 180 && spaceAbove > spaceBelow;
      const availableSpace = openAbove ? spaceAbove : spaceBelow;
      const width = anchor.width;
      const left = Math.max(
        viewportPadding,
        Math.min(anchor.left, window.innerWidth - width - viewportPadding),
      );

      setDropdownStyle({
        position: "fixed",
        left,
        width,
        zIndex: 1200,
        maxHeight: Math.max(64, Math.min(280, availableSpace)),
        overflowY: "auto",
        ...(openAbove
          ? { bottom: window.innerHeight - anchor.top + gap }
          : { top: anchor.bottom + gap }),
      });
    };

    const handlePointerDown = (event) => {
      if (
        !rootRef.current?.contains(event.target) &&
        !listRef.current?.contains(event.target)
      ) {
        onClose();
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    updateDropdownPosition();
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", updateDropdownPosition);
    window.addEventListener("scroll", updateDropdownPosition, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", updateDropdownPosition);
      window.removeEventListener("scroll", updateDropdownPosition, true);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen && dropdownStyle) {
      selectedRef.current?.scrollIntoView({ block: "nearest" });
    }
  }, [isOpen, dropdownStyle]);

  return (
    <>
      <div ref={rootRef}>
        <button
          type="button"
          aria-label="ساعت"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          onClick={onToggle}
          className={selectClass}
        >
          <span>{value || "--"}</span>
          <ChevronDown size={14} className="text-ink-400" aria-hidden="true" />
        </button>
      </div>

      {isOpen &&
        dropdownStyle &&
        createPortal(
          <div
            ref={listRef}
            role="listbox"
            aria-label="انتخاب ساعت"
            style={dropdownStyle}
            className="overscroll-contain rounded-lg border border-ink-100 bg-white p-1 shadow-lg"
          >
            {HOURS.map((hour) => (
              <button
                type="button"
                role="option"
                aria-selected={value === hour}
                key={hour}
                ref={value === hour ? selectedRef : null}
                onClick={() => {
                  onChange(hour);
                  onClose();
                }}
                className={`block w-full rounded-md px-2 py-1.5 text-center text-sm tabular transition-colors hover:bg-amber-50 hover:text-amber-700 ${
                  value === hour
                    ? "bg-amber-50 font-semibold text-amber-700"
                    : "text-ink-800"
                }`}
              >
                {hour}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}

export default function TimeInput24({ label, value, onChange, required }) {
  const [hour = ""] = (value || "").split(":");
  const [isOpen, setIsOpen] = useState(false);

  const closeDropdown = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggleDropdown = useCallback(() => {
    setIsOpen((previous) => !previous);
  }, []);

  const setHour = (selectedHour) => {
    onChange(`${selectedHour}:00`);
  };

  return (
    <div className="flex min-w-0 items-center justify-start gap-1">
      {label && (
        <span className="shrink-0 text-sm font-medium text-ink-700">
          {label}
          {required && <span className="ms-1 text-amber-600">*</span>}
        </span>
      )}

      <div className="flex shrink-0 items-center gap-1.5" dir="ltr">
        <Clock size={16} className="shrink-0 text-ink-300" aria-hidden="true" />
        <HourSelect
          value={hour}
          onChange={setHour}
          isOpen={isOpen}
          onToggle={toggleDropdown}
          onClose={closeDropdown}
        />
      </div>
    </div>
  );
}
