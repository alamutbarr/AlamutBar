import { motion } from 'framer-motion';
import BrandMark from '../../components/common/BrandMark';

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: (delay = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.5, delay, ease: 'easeOut' } }),
};

export default function AuthShell({ title, subtitle, children }) {
  return (
    <div className="grid min-h-screen bg-route-bg lg:grid-cols-2" dir="rtl">
      {/* پنل برند */}
      <div className="relative hidden overflow-hidden bg-ink-950 bg-ink-radial lg:flex lg:flex-col lg:justify-between lg:p-12">
        <RouteMotif />

        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={0}
          className="relative z-10"
        >
          <BrandMark light subtitle="حمل‌ونقل و لجستیک" />
        </motion.div>

        <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0.12} className="relative z-10 max-w-sm">
          <p className="text-[11px] font-medium tracking-wide text-[#d7b56d]">حمل بار، با خیال راحت</p>
          <p className="mt-3 text-3xl font-bold leading-snug text-[#f7f6f0]">
            مسیر مطمئن،
            <span className="mt-1 block text-[#159a9c]">حمل هوشمند.</span>
          </p>
          <p className="mt-4 text-sm leading-8 text-[#f7f6f0]/75">
            بار را در چند مرحله ثبت کنید. رانندهٔ مناسب پیدا می‌شود و مسیر حمل تا لحظهٔ تحویل روشن می‌ماند.
          </p>
        </motion.div>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={0.24}
          className="glass-card relative z-10 flex gap-8 rounded-xl px-5 py-4 text-ink-300"
        >
          <div>
            <p className="tabular text-xl font-bold text-white">۶</p>
            <p className="text-xs">نوع ناوگان</p>
          </div>
          <div>
            <p className="tabular text-xl font-bold text-white">۲۴/۷</p>
            <p className="text-xs">پشتیبانی و رهگیری</p>
          </div>
        </motion.div>
      </div>

      {/* فرم */}
      <div className="flex items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="w-full max-w-sm"
        >
          <div className="mb-8 lg:hidden">
            <BrandMark subtitle="پنل صاحب کالا" />
          </div>
          <h1 className="text-2xl font-bold text-ink-900">{title}</h1>
          <p className="mt-1.5 mb-8 text-sm text-ink-300">{subtitle}</p>
          {children}
        </motion.div>
      </div>
    </div>
  );
}

function RouteMotif() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.35]"
      viewBox="0 0 480 640"
      fill="none"
      preserveAspectRatio="xMidYMid slice"
    >
      <path
        d="M -20 560 C 100 560, 90 420, 210 400 S 340 300, 320 200 S 420 60, 500 40"
        stroke="#159a9c"
        strokeWidth="2"
        strokeDasharray="2 14"
        strokeLinecap="round"
      />
      <circle cx="-20" cy="560" r="5" fill="#d7b56d" className="animate-pulse" />
      <circle cx="210" cy="400" r="4" fill="#d8e1dc" />
      <circle cx="320" cy="200" r="4" fill="#d8e1dc" />
      <circle cx="500" cy="40" r="5" fill="#d7b56d" className="animate-pulse" />
    </svg>
  );
}
