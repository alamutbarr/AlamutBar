import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PackagePlus, Package } from 'lucide-react';
import { getMyShipments } from '../../api/shipment.api';
import Button from '../../components/common/Button';
import StatusBadge from '../../components/common/StatusBadge';
import ShipmentDetailsModal from '../../components/shipment/ShipmentDetailsModal';
import { formatToman } from '../../utils/currency.util';

export default function ShipmentHistory() {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    getMyShipments()
      .then(setShipments)
      .catch(() => setShipments([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="panel-kicker">صاحب کالا</p>
          <h1 className="text-2xl font-bold text-ink-900">بارهای من</h1>
          <p className="mt-1 text-sm text-ink-300">فهرست کامل درخواست‌های حمل ثبت‌شده</p>
        </div>
        <Button as={Link} to="/owner/create-shipment" variant="accent" icon={PackagePlus}>
          ثبت بار جدید
        </Button>
      </div>

      <section className="panel-section">
        {loading ? (
          <p className="px-5 py-14 text-center text-sm text-ink-300">در حال بارگذاری...</p>
        ) : shipments.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-5 py-14 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-[#087f8c]">
              <Package size={22} />
            </span>
            <p className="text-sm font-medium text-ink-700">هنوز باری ثبت نکرده‌اید</p>
          </div>
        ) : (
          <>
          <ul className="divide-y divide-ink-50 md:hidden">
            {shipments.map((s) => (
              <li key={s.id} className="px-4 py-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="tabular font-bold text-ink-900">{s.tracking_code}</span>
                  <StatusBadge status={s.workflow_status === 'ON_HOLD' ? 'on_hold' : s.status} />
                </div>
                <p className="text-sm text-ink-700">
                  {s.originCity?.name || 'مبدأ'} ← {s.destCity?.name || 'مقصد'}
                </p>
                <p className="mt-1 text-xs leading-6 text-ink-400">
                  {s.weight_kg} کیلوگرم · {formatToman(s.operator_price || s.proposed_price)} ·{' '}
                  {new Intl.DateTimeFormat('fa-IR').format(new Date(s.loading_date))}
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setOpenId(s.id)}
                    className="rounded-md bg-[#087f8c] px-3 py-1.5 text-xs font-semibold text-[#f7f6f0]"
                  >
                    جزئیات
                  </button>
                  <Link
                    to="/owner/create-shipment"
                    state={{ repeat: s }}
                    className="rounded-md border border-[#d7b56d] px-3 py-1.5 text-xs font-semibold text-[#17383b]"
                  >
                    تکرار این حمل
                  </Link>
                </div>
              </li>
            ))}
          </ul>
          <table className="hidden w-full text-right text-sm md:table">
            <thead>
              <tr className="border-b border-ink-50 text-xs text-ink-300">
                <th className="px-5 py-3 font-medium">کد پیگیری</th>
                <th className="px-5 py-3 font-medium">مسیر</th>
                <th className="px-5 py-3 font-medium">وزن</th>
                <th className="px-5 py-3 font-medium">کرایه</th>
                <th className="px-5 py-3 font-medium">تاریخ بارگیری</th>
                <th className="px-5 py-3 font-medium">وضعیت</th>
                <th className="px-5 py-3 font-medium"> </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-50">
              {shipments.map((s) => (
                <tr key={s.id} className="transition-colors hover:bg-ink-50/40">
                  <td className="px-5 py-4">
                    <button type="button" onClick={() => setOpenId(s.id)} className="tabular font-bold text-ink-900 hover:text-[#087f8c]">
                      {s.tracking_code}
                    </button>
                  </td>
                  <td className="max-w-[220px] truncate px-5 py-4 text-ink-500">
                    {s.originCity?.name} ← {s.destCity?.name}
                  </td>
                  <td className="tabular px-5 py-4 text-ink-500">{s.weight_kg} kg</td>
                  <td className="tabular px-5 py-4 text-ink-500">
                    {formatToman(s.operator_price || s.proposed_price)}
                  </td>
                  <td className="tabular px-5 py-4 text-ink-500">
                    {new Intl.DateTimeFormat('fa-IR').format(new Date(s.loading_date))}
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={s.workflow_status === 'ON_HOLD' ? 'on_hold' : s.status} />
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setOpenId(s.id)}
                        className="rounded-md bg-[#087f8c] px-3 py-1.5 text-xs font-semibold text-[#f7f6f0]"
                      >
                        جزئیات
                      </button>
                      <Link
                        to="/owner/create-shipment"
                        state={{ repeat: s }}
                        className="rounded-md border border-[#d7b56d] px-3 py-1.5 text-xs font-semibold text-[#17383b]"
                      >
                        تکرار
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </>
        )}
      </section>

      <ShipmentDetailsModal
        open={openId != null}
        shipmentId={openId}
        onClose={() => setOpenId(null)}
        onSaved={(updated) => {
          setShipments((rows) => rows.map((row) => (row.id === updated.id ? { ...row, ...updated } : row)));
        }}
      />
    </div>
  );
}
