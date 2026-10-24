import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { flexRender } from '@tanstack/react-table';
import { getCoreRowModel, useLegacyTable as useReactTable } from '@tanstack/react-table/legacy';
import * as Hover from '@radix-ui/react-hover-card';
import { api } from '../api';
import { WORKFLOW_LABELS, money, toneOfStatus, when } from '../format';
import { Badge, Page, SkeletonRows } from '../components/ui';

export default function Orders() {
  const navigate = useNavigate();
  const [query, setQuery] = useState({ page: 1, status: '', q: '', city: '', hasAlert: false });
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams({ page: String(query.page), limit: '12' });
    if (query.status) params.set('status', query.status);
    if (query.q) params.set('q', query.q);
    if (query.city) params.set('city', query.city);
    if (query.hasAlert) params.set('hasAlert', 'true');
    setError('');
    api(`/orders?${params}`).then(setData).catch((err) => setError(err.message || 'فهرست سفارش‌ها بارگذاری نشد.'));
  }, [query]);

  const columns = useMemo(() => [
    { header: 'پیگیری', accessorKey: 'trackingCode' },
    { header: 'مسیر', cell: ({ row }) => `${row.original.loading.city} ← ${row.original.unloading.city}` },
    { header: 'وضعیت', cell: ({ row }) => <Badge tone={toneOfStatus(row.original.workflowStatus)}>{row.original.workflowLabel}</Badge> },
    { header: 'راننده', cell: ({ row }) => row.original.driver ? (
      <Hover.Root>
        <Hover.Trigger asChild><button type="button" className="btn secondary">{row.original.driver.fullName}</button></Hover.Trigger>
        <Hover.Portal>
          <Hover.Content className="card" style={{ padding: 12 }}>
            <div>{row.original.driver.phone}</div>
            <div>{row.original.driver.plate}</div>
          </Hover.Content>
        </Hover.Portal>
      </Hover.Root>
    ) : '—' },
    { header: 'قیمت', cell: ({ row }) => money(row.original.estimatedPrice) },
    { header: 'هشدار', cell: ({ row }) => row.original.openAlerts ? <Badge tone="crit">{row.original.openAlerts.toLocaleString('fa-IR')}</Badge> : '—' },
    { header: 'زمان', cell: ({ row }) => when(row.original.createdAt) },
  ], []);

  const table = useReactTable({ data: data?.items || [], columns, getCoreRowModel: getCoreRowModel() });
  if (error) return <Page title="سفارش‌ها"><p style={{ color: 'var(--alamut-crit)' }}>{error}</p></Page>;
  if (!data) return <SkeletonRows />;

  return (
    <Page title="سفارش‌ها">
      <div className="form-grid" style={{ marginBottom: 12 }}>
        <input className="field" placeholder="جستجوی کد، بارنامه یا گیرنده" value={query.q} onChange={(event) => setQuery({ ...query, page: 1, q: event.target.value })} />
        <input className="field" placeholder="شهر مبدأ" value={query.city} onChange={(event) => setQuery({ ...query, page: 1, city: event.target.value })} />
        <select className="select" value={query.status} onChange={(event) => setQuery({ ...query, page: 1, status: event.target.value })}>
          <option value="">همه وضعیت‌ها</option>
          {Object.entries(WORKFLOW_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={query.hasAlert} onChange={(event) => setQuery({ ...query, page: 1, hasAlert: event.target.checked })} />
          فقط هشدار فعال
        </label>
      </div>
      <div className="card table-wrap">
        <table className="data">
          <thead>{table.getHeaderGroups().map((group) => <tr key={group.id}>{group.headers.map((header) => <th key={header.id}>{flexRender(header.column.columnDef.header, header.getContext())}</th>)}</tr>)}</thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} onClick={() => navigate(`/admin/orders/${row.original.id}`)} style={{ cursor: 'pointer' }}>
                {row.getVisibleCells().map((cell) => <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button type="button" className="btn secondary" disabled={query.page <= 1} onClick={() => setQuery({ ...query, page: query.page - 1 })}>قبلی</button>
        <span className="muted">صفحه {query.page.toLocaleString('fa-IR')} از {Math.max(1, Math.ceil(data.total / data.limit)).toLocaleString('fa-IR')}</span>
        <button type="button" className="btn secondary" disabled={query.page * data.limit >= data.total} onClick={() => setQuery({ ...query, page: query.page + 1 })}>بعدی</button>
      </div>
    </Page>
  );
}
