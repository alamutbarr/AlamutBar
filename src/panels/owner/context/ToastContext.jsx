import { createContext, useCallback, useState } from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

export const ToastContext = createContext();

const STYLES = {
  success: { icon: CheckCircle2, bg: 'bg-emerald-600', },
  error: { icon: XCircle, bg: 'bg-red-600' },
  info: { icon: Info, bg: 'bg-ink-900' },
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((type, message, duration = 4500) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => remove(id), duration);
  }, [remove]);

  const toast = {
    success: (msg) => push('success', msg),
    error: (msg) => push('error', msg),
    info: (msg) => push('info', msg),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div
        dir="rtl"
        className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4"
      >
        {toasts.map((t) => {
          const { icon: Icon, bg } = STYLES[t.type];
          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-lg ${bg} px-4 py-3 text-sm text-white shadow-lg animate-[fadeIn_.15s_ease-out]`}
            >
              <Icon size={18} className="mt-0.5 shrink-0" />
              <p className="flex-1 leading-6">{t.message}</p>
              <button onClick={() => remove(t.id)} className="shrink-0 opacity-70 hover:opacity-100">
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};
