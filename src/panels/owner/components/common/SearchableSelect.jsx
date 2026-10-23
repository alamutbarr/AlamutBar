import { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, X } from "lucide-react";

const normalizeFa = (str) => {
  if (!str) return "";

  return String(str)
    .normalize("NFKC")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[\u064A\u0649]/g, "ی")
    .replace(/[\u0643]/g, "ک")
    .replace(/[\u0640]/g, "")
    .replace(/[\u200c\u200d\s]+/g, " ")
    .trim()
    .toLowerCase();
};

// انتقال فوکوس به المان تعاملی بعدی در فرم
const focusNextField = (currentElement) => {
  if (!currentElement) return;

  const formContainer =
    currentElement.closest("form") ||
    currentElement.closest(".space-y-5") ||
    document;

  const focusables = Array.from(
    formContainer.querySelectorAll(
      'input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled]), button[type="submit"]',
    ),
  ).filter((el) => el.offsetParent !== null);

  const currentIndex = focusables.indexOf(currentElement);

  if (currentIndex > -1 && currentIndex < focusables.length - 1) {
    focusables[currentIndex + 1].focus();
  }
};

export default function SearchableSelect({
  label,
  value,
  onChange,
  options = [],
  placeholder = "تایپ یا انتخاب کنید...",
  disabled = false,
  required = false,
  error = null,
  noResultsText = "موردی یافت نشد",
  sortByRelevance = false,
  portalDropdown = false,
  dropdownMaxHeight = 280,
  stickyOptionValue = null,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const dropdownRef = useRef(null);

  const [dropdownStyle, setDropdownStyle] = useState(null);

  const selectedItem = useMemo(() => {
    return options.find((opt) => String(opt.value) === String(value));
  }, [options, value]);

  useEffect(() => {
    if (selectedItem) {
      setSearchTerm(selectedItem.label);
    } else if (!value) {
      setSearchTerm("");
    }
  }, [selectedItem, value]);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      const clickedInsideWrapper =
        wrapperRef.current?.contains(e.target) ?? false;
      const clickedInsideDropdown =
        dropdownRef.current?.contains(e.target) ?? false;

      if (!clickedInsideWrapper && !clickedInsideDropdown) {
        setIsOpen(false);
        setSearchTerm(selectedItem ? selectedItem.label : "");
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [selectedItem]);

  useEffect(() => {
    if (!isOpen) {
      setDropdownStyle(null);
      return;
    }

    const updateDropdownPosition = () => {
      const anchor = inputRef.current?.getBoundingClientRect();
      if (!anchor) return;

      const gap = 4;
      const viewportPadding = 8;

      const spaceBelow =
        window.innerHeight - anchor.bottom - gap - viewportPadding;
      const spaceAbove = anchor.top - gap - viewportPadding;
      const openAbove = spaceBelow < 180 && spaceAbove > spaceBelow;
      const availableSpace = openAbove ? spaceAbove : spaceBelow;

      setDropdownStyle({
        position: "fixed",
        left: anchor.left,
        width: anchor.width,
        zIndex: 1200,
        maxHeight: Math.max(80, Math.min(dropdownMaxHeight, availableSpace)),
        overflowY: "auto",
        ...(openAbove
          ? { bottom: window.innerHeight - anchor.top + gap }
          : { top: anchor.bottom + gap }),
      });
    };

    updateDropdownPosition();

    window.addEventListener("resize", updateDropdownPosition);
    window.addEventListener("scroll", updateDropdownPosition, true);

    return () => {
      window.removeEventListener("resize", updateDropdownPosition);
      window.removeEventListener("scroll", updateDropdownPosition, true);
    };
  }, [isOpen, dropdownMaxHeight]);

  const filteredOptions = useMemo(() => {
    if (
      !searchTerm.trim() ||
      (selectedItem && searchTerm === selectedItem.label)
    ) {
      return options;
    }

    const cleanQuery = normalizeFa(searchTerm);

    return options
      .map((opt, originalIndex) => {
        const searchTarget = normalizeFa(opt.searchKey || opt.label);

        if (!searchTarget.includes(cleanQuery)) return null;

        return {
          opt,
          originalIndex,
          priority: searchTarget.startsWith(cleanQuery) ? 0 : 1,
        };
      })
      .filter(Boolean)
      .sort(
        (a, b) => a.priority - b.priority || a.originalIndex - b.originalIndex,
      )
      .map(({ opt }) => opt);
  }, [options, searchTerm, selectedItem]);

  const stickyOption = stickyOptionValue
    ? options.find((opt) => String(opt.value) === String(stickyOptionValue))
    : null;

  const dropdownOptions = stickyOption
    ? filteredOptions.filter(
        (opt) => String(opt.value) !== String(stickyOptionValue),
      )
    : filteredOptions;

  const selectableOptions = stickyOption
    ? [...dropdownOptions, stickyOption]
    : filteredOptions;

  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredOptions]);

  useEffect(() => {
    if (!isOpen || !listRef.current) return;

    const activeOption = listRef.current.querySelector(
      `[data-option-index="${highlightedIndex}"]`,
    );

    if (activeOption) {
      activeOption.scrollIntoView({ block: "nearest" });
    }
  }, [highlightedIndex, isOpen]);

  const handleSelect = (opt) => {
    if (!opt) return;

    onChange(opt.value);
    setSearchTerm(opt.label);
    setIsOpen(false);

    setTimeout(() => {
      focusNextField(inputRef.current);
    }, 50);
  };

  const handleKeyDown = (e) => {
    if (disabled) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();

      if (!isOpen) {
        setIsOpen(true);
      } else {
        setHighlightedIndex((prev) =>
          prev < selectableOptions.length - 1 ? prev + 1 : prev,
        );
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();

      if (isOpen) {
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      }
    } else if (e.key === "Enter") {
      e.preventDefault();

      if (isOpen && selectableOptions.length > 0) {
        const targetOption =
          selectableOptions[highlightedIndex] || selectableOptions[0];

        handleSelect(targetOption);
      } else if (!isOpen) {
        focusNextField(inputRef.current);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange("");
    setSearchTerm("");
    setIsOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div
      className={`relative block text-right ${isOpen ? "z-30" : "z-0"}`}
      ref={wrapperRef}
    >
      {label && (
        <span className="mb-1.5 flex items-baseline gap-1 text-sm font-medium text-ink-700">
          {label}
          {required && <span className="text-amber-600">*</span>}
        </span>
      )}

      <div
        className={`relative flex w-full items-center rounded-lg border bg-white text-sm text-ink-900 transition-colors ${
          disabled
            ? "cursor-not-allowed bg-gray-100 opacity-60"
            : "hover:border-ink-300"
        } ${
          isOpen
            ? "border-amber-400 ring-2 ring-amber-500/30"
            : error
              ? "border-red-300"
              : "border-ink-100"
        }`}
      >
        <input
          ref={inputRef}
          type="text"
          disabled={disabled}
          value={searchTerm}
          placeholder={placeholder}
          className="w-full bg-transparent px-3.5 py-2.5 text-sm text-ink-900 outline-none placeholder:text-ink-300"
          onClick={() => !disabled && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          onChange={(e) => {
            setSearchTerm(e.target.value);

            if (!isOpen) {
              setIsOpen(true);
            }

            if (value && e.target.value !== selectedItem?.label) {
              onChange("");
            }
          }}
        />

        <div className="flex items-center gap-1 pl-3 text-ink-300">
          {value && !disabled && (
            <button
              type="button"
              className="p-1 transition-colors hover:text-red-500"
              onClick={handleClear}
              title="پاک کردن"
            >
              <X size={15} />
            </button>
          )}

          <ChevronDown
            size={16}
            className={`cursor-pointer transition-transform ${
              isOpen ? "rotate-180 text-amber-500" : ""
            }`}
            onClick={() => !disabled && setIsOpen((open) => !open)}
          />
        </div>
      </div>

      {isOpen &&
        !disabled &&
        dropdownStyle &&
        createPortal(
          <div
            ref={dropdownRef}
            style={
              stickyOption
                ? {
                    ...dropdownStyle,
                    height: dropdownStyle.maxHeight,
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                  }
                : dropdownStyle
            }
            className="rounded-lg border border-ink-100 bg-white shadow-xl"
          >
            <div
              ref={listRef}
              style={
                stickyOption
                  ? {
                      flex: 1,
                      minHeight: 0,
                      overflowY: "auto",
                    }
                  : {
                      maxHeight: dropdownStyle.maxHeight,
                      overflowY: "auto",
                    }
              }
            >
              {filteredOptions.length === 0 && (
                <div className="px-3 py-3 text-center text-xs text-ink-300">
                  {noResultsText}
                </div>
              )}

              {dropdownOptions.map((opt, idx) => {
                const isSelected = String(opt.value) === String(value);
                const isHighlighted = idx === highlightedIndex;

                return (
                  <div
                    key={opt.value}
                    data-option-index={idx}
                    className={`flex cursor-pointer items-center justify-between border-b border-gray-50 px-3 py-2 text-sm last:border-0 ${
                      isHighlighted
                        ? "bg-amber-50 font-medium text-amber-900"
                        : ""
                    } ${
                      isSelected
                        ? "bg-amber-100/70 font-semibold text-amber-950"
                        : "text-ink-800"
                    }`}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    onClick={() => handleSelect(opt)}
                  >
                    <span>{opt.label}</span>

                    {opt.subLabel && (
                      <span className="pointer-events-none rounded bg-gray-100 px-2 py-0.5 text-xs font-normal text-ink-400">
                        {opt.subLabel}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {stickyOption && (
              <div
                data-option-index={dropdownOptions.length}
                className={`flex shrink-0 cursor-pointer items-center justify-between border-t border-ink-100 px-3 py-2 text-sm ${
                  highlightedIndex === dropdownOptions.length
                    ? "bg-amber-50 font-medium text-amber-900"
                    : "text-ink-800"
                } ${
                  String(stickyOption.value) === String(value)
                    ? "bg-amber-100/70 font-semibold text-amber-950"
                    : ""
                }`}
                onMouseEnter={() => setHighlightedIndex(dropdownOptions.length)}
                onClick={() => handleSelect(stickyOption)}
              >
                <span>{stickyOption.label}</span>

                {stickyOption.subLabel && (
                  <span className="pointer-events-none rounded bg-gray-100 px-2 py-0.5 text-xs font-normal text-ink-400">
                    {stickyOption.subLabel}
                  </span>
                )}
              </div>
            )}
          </div>,
          document.body,
        )}

      {error && (
        <span className="mt-1 block text-xs text-red-600">{error}</span>
      )}
    </div>
  );
}
