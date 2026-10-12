import { useState } from 'react';
import { Phone, X } from 'lucide-react';
export function SosButton() {
    const [open, setOpen] = useState(false);
    return (<>
      <button onClick={() => setOpen(true)} className="flex items-center gap-2 rounded-xl border-2 border-red-300 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700 transition-all hover:bg-red-100 hover:border-red-400 active:scale-95">
        <Phone className="w-4 h-4"/>
        تماس با اپراتور
      </button>

      {open && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">تماس با اپراتور</h3>
              <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                <X className="w-5 h-5"/>
              </button>
            </div>
            <p className="text-sm text-slate-500 mb-4">
              در صورت بروز مشکل یا نیاز به راهنمایی، با اپراتور مرکز تماس بگیرید.
            </p>
            <a href="tel:02112345678" className="flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-base font-bold text-white transition hover:bg-green-700 active:scale-95">
              <Phone className="w-5 h-5"/>
              ۰۲۱-۱۲۳۴۵۶۷۸
            </a>
            <p className="mt-3 text-center text-xs text-slate-400">
              خط ویژه رانندگان — ۲۴ ساعته
            </p>
          </div>
        </div>)}
    </>);
}
