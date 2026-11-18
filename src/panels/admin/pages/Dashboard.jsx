import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../api';
import { WORKFLOW_LABELS, money, when } from '../format';
import { brand } from '../../../design/tokens';
import { Page, SkeletonRows } from '../components/ui';
import { useAdmin } from '../auth';

export default function Dashboard() {
  const { can } = useAdmin();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api('/dashboard').then(setData).catch((err) => setError(err.message || 'داشبورد بارگذاری نشد.'));
  }, []);
  if (error) return <Page title="مرکز کنترل"><p style={{ color: 'var(--alamut-crit)' }}>{error}</p></Page>;
  if (!data) return <SkeletonRows />;
  const cards = [
    ['سفارش‌ها', data.cards.orders],
    ['مأموریت فعال', data.cards.active],
    ['هشدار باز', data.cards.openAlerts],
    ['هشدار بحرانی', data.cards.criticalAlerts],
    ['راننده آماده', data.cards.readyDrivers],
    ['راننده مشغول', data.cards.busyDrivers],
    ['تحویل موفق', data.cards.delivered],
    ['نیازمند پیگیری', data.cards.followUp],
  ];
  if (data.cards.openTickets != null) cards.push(['تیکت باز', data.cards.openTickets]);
  if (data.cards.outstanding != null) cards.push(['مانده صورتحساب', money(data.cards.outstanding)]);
  if (can('reports.financial')) {
    cards.push(['کرایه', money(data.cards.freight)], ['جریمه', money(data.cards.penalties)]);
  }
  return (
    <Page title="مرکز کنترل">
      <div className="stat-grid">
        {cards.map(([label, value]) => (
          <article key={label} className="card" style={{ padding: 16 }}>
            <div className="muted">{label}</div>
            <strong style={{ fontSize: 28 }}>{typeof value === 'number' ? value.toLocaleString('fa-IR') : value}</strong>
          </article>
        ))}
      </div>
      {data.byStatus && (
        <div className="card" style={{ marginTop: 16, padding: 16 }}>
          <h2 style={{ marginTop: 0 }}>توزیع وضعیت</h2>
          {(Array.isArray(data.byStatus) ? data.byStatus : []).filter((item) => item.count).map((item) => (
            <p key={item.status}>{item.label || WORKFLOW_LABELS[item.status] || item.status}: {Number(item.count).toLocaleString('fa-IR')}</p>
          ))}
        </div>
      )}
      {(data.recent || []).length > 0 && (
        <div className="card" style={{ marginTop: 16, padding: 16 }}>
          <h2 style={{ marginTop: 0 }}>پنج محموله اخیر</h2>
          {data.recent.map((row) => (
            <p key={row.id}><Link to={`/admin/orders/${row.id}`}>{row.trackingCode || row.id}</Link> — {row.label || WORKFLOW_LABELS[row.status] || row.status} — {when(row.createdAt)}</p>
          ))}
        </div>
      )}
      <div className="card" style={{ marginTop: 16, padding: 16, height: 320 }}>
        <h2 style={{ marginTop: 0 }}>سفارش‌های هفت روز اخیر</h2>
        <ResponsiveContainer width="100%" height="80%">
          <BarChart data={data.trend}>
            <XAxis dataKey="date" tick={{ fill: '#526d70', fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fill: '#526d70' }} />
            <Tooltip />
            <Bar dataKey="count" fill={brand.primary} radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Page>
  );
}
