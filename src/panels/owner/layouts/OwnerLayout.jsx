import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import Sidebar from '../components/common/Sidebar';
import BrandMark from '../components/common/BrandMark';

export default function OwnerLayout() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex h-screen overflow-hidden bg-route-bg" dir="rtl">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-route-line bg-[#f7f6f0]/95 px-4 py-3 backdrop-blur lg:hidden">
          <BrandMark subtitle="صاحب کالا" />
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="rounded-md p-2 text-ink-700 hover:bg-white"
            aria-label="باز کردن منو"
          >
            <Menu size={22} />
          </button>
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-5xl px-4 py-5 sm:px-6 sm:py-8 md:px-10">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}
