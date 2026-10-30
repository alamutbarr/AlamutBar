import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Phone, X } from "lucide-react";

const OPERATOR_TEL = "02112345678";
const OPERATOR_DISPLAY = "۰۲۱-۱۲۳۴۵۶۷۸";

export function SosButton({ variant = "default" }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const compact = variant === "compact";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          compact
            ? "inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-700 transition hover:border-red-300 hover:bg-red-100"
            : "flex items-center gap-2 rounded-xl border-2 border-red-300 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700 transition-all hover:border-red-400 hover:bg-red-100 active:scale-95"
        }
      >
        <Phone className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
        تماس با اپراتور
      </button>

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[80] flex items-center justify-center bg-[#10282b]/70 backdrop-blur-md"
            onClick={() => setOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="operator-call-number"
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute left-5 top-5 rounded-full p-2 text-[#f7f6f0]/80 transition hover:bg-white/10 hover:text-[#f7f6f0]"
              aria-label="بستن"
            >
              <X className="h-6 w-6" />
            </button>
            <a
              href={`tel:${OPERATOR_TEL}`}
              onClick={(event) => event.stopPropagation()}
              className="flex flex-col items-center gap-4 px-6 text-center text-[#f7f6f0]"
            >
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
                <Phone className="h-8 w-8" />
              </span>
              <span
                id="operator-call-number"
                className="text-4xl font-extrabold tracking-wide tabular-nums sm:text-5xl"
                dir="ltr"
              >
                {OPERATOR_DISPLAY}
              </span>
              <span className="text-sm font-medium text-[#f7f6f0]/80">
                تماس با اپراتور
              </span>
            </a>
          </div>,
          document.body
        )}
    </>
  );
}
