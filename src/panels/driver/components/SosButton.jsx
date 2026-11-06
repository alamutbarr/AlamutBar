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
            className="fixed inset-0 z-[80] flex items-center justify-center bg-[#10282b]/55 p-4 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="operator-call-title"
          >
            <div
              className="w-full max-w-sm rounded-2xl border border-[#d8e1dc] bg-[#f7f6f0] p-6 text-center shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-4 flex items-start justify-between">
                <h3
                  id="operator-call-title"
                  className="text-base font-bold text-[#17383b]"
                >
                  تماس با اپراتور
                </h3>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg p-1.5 text-[#526d70] transition hover:bg-white"
                  aria-label="بستن"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="mb-5 text-sm leading-6 text-[#526d70]">
                در صورت بروز مشکل یا نیاز به راهنمایی، با این شماره تماس بگیرید.
              </p>
              <a
                href={`tel:${OPERATOR_TEL}`}
                className="flex items-center justify-center gap-2 rounded-xl bg-[#087f8c] px-4 py-3 text-xl font-extrabold tracking-wide text-[#f7f6f0] transition hover:bg-[#159a9c]"
                dir="ltr"
              >
                <Phone className="h-5 w-5" />
                {OPERATOR_DISPLAY}
              </a>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
