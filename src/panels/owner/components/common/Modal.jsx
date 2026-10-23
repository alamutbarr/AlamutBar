import { X } from 'lucide-react';
import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export default function Modal({ open, onClose, title, children, footer, wide = false }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-ink-950/55 backdrop-blur-[2px]"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 4 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className={`relative flex max-h-[min(92vh,900px)] w-full flex-col rounded-2xl bg-white p-5 shadow-panel-lg sm:p-6 ${
              wide ? "max-w-3xl" : "max-w-md"
            }`}
          >
            <div className="mb-4 flex shrink-0 items-center justify-between gap-3">
              <h3 className="text-lg font-bold text-ink-900">{title}</h3>
              <button
                onClick={onClose}
                className="rounded-full p-1.5 text-ink-300 transition-colors hover:bg-ink-50 hover:text-ink-700"
                aria-label="بستن"
              >
                <X size={18} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto text-sm text-ink-500">{children}</div>
            {footer && <div className="mt-5 flex shrink-0 flex-wrap justify-end gap-2">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
