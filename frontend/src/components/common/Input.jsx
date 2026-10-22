export default function Input({
  label,
  error,
  hint,
  icon: Icon,
  as = "input",
  className = "",
  required,
  onKeyDown,
  ...props
}) {
  const Field = as;

  const handleKeyDown = (e) => {
    if (onKeyDown) {
      onKeyDown(e);
      if (e.defaultPrevented) return;
    }

    if (e.key === "Enter") {
      // در textarea با Shift+Enter خط جدید ایجاد می‌شود، با Enter خالی به فیلد بعدی می‌رود
      if (as === "textarea" && e.shiftKey) {
        return;
      }
      e.preventDefault();

      const currentElement = e.target;
      const container =
        currentElement.closest("form") ||
        currentElement.closest(".space-y-5") ||
        document;
      const focusables = Array.from(
        container.querySelectorAll(
          'input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled]), button[type="submit"]',
        ),
      ).filter((el) => el.offsetParent !== null);

      const idx = focusables.indexOf(currentElement);
      if (idx > -1 && idx < focusables.length - 1) {
        focusables[idx + 1].focus();
      }
    }
  };

  return (
    <label className="block">
      {label && (
        <span className="mb-1.5 flex items-baseline gap-1 text-sm font-medium text-ink-700">
          {label}
          {required && <span className="text-amber-600">*</span>}
        </span>
      )}
      <span className="relative flex items-center">
        {Icon && (
          <Icon
            size={17}
            className="pointer-events-none absolute right-3 text-ink-300"
          />
        )}
        <Field
          className={`w-full rounded-md border bg-white px-3.5 py-2.5 text-sm text-ink-900
            placeholder:text-ink-300 transition-colors
            focus:outline-none focus:ring-2 focus:ring-[#087f8c]/30
            ${Icon ? "pr-10" : ""}
            ${error ? "border-red-300 focus:border-red-400" : "border-ink-100 focus:border-[#087f8c]"}
            ${className}`}
          onKeyDown={handleKeyDown}
          {...props}
        />
      </span>
      {error ? (
        <span className="mt-1 block text-xs text-red-600">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-ink-300">{hint}</span>
      ) : null}
    </label>
  );
}
