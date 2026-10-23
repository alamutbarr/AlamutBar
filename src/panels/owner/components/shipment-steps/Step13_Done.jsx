import { Link } from 'react-router-dom';
import { CheckCircle2, LayoutGrid, History } from 'lucide-react';
import Button from '../common/Button';

export default function Step13_Done({ data }) {
  return (
    <div className="space-y-6 py-6 text-center">
      <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
        <CheckCircle2 size={30} />
      </span>
      <div>
        <h2 className="text-xl font-bold text-ink-900">بار شما با موفقیت ثبت شد</h2>
        {data.trackingCode && (
          <p className="tabular mt-2 text-sm font-bold text-ink-700">کد پیگیری: {data.trackingCode}</p>
        )}
        <p className="mt-1.5 text-sm text-ink-300">
          درخواست شما توسط اپراتور بررسی می‌شود و بعد از تعیین قیمت نهایی، اعلان دریافت می‌کنید.
        </p>
        {data.needsManualReview && (
          <p className="mx-auto mt-3 max-w-sm rounded-lg bg-amber-50 px-3.5 py-2.5 text-xs text-amber-700">
            خودروی انتخابی با وزن یا ابعاد بار شما تناسب کامل ندارد؛ این درخواست برای بررسی دقیق‌تر نزد اپراتور علامت‌گذاری شد.
          </p>
        )}
      </div>
      <div className="flex flex-col justify-center gap-3 sm:flex-row">
        <Button as={Link} to="/owner/dashboard" variant="ghost" icon={LayoutGrid}>
          بازگشت به داشبورد
        </Button>
        <Button as={Link} to="/owner/shipments" variant="accent" icon={History}>
          مشاهده بارهای من
        </Button>
      </div>
    </div>
  );
}
