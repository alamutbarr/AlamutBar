import { useEffect, useState } from 'react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../api';
import { money } from '../format';
import { brand } from '../../../design/tokens';
import { Page, SkeletonRows } from '../components/ui';
import { useAdmin } from '../auth';

export default function Dashboard() {
  const { can } = useAdmin();
  const [data, setData] = useState(null);
  useEffect(() => { api('/dashboard').then(setData).catch(() => setData(null)); }, []);
  if (!data) return <SkeletonRows />;
  const cards = [
    ['سفارش‌ها', data.cards.orders],
    ['مأموریت فعال', data.cards.active],
    ['هشدار باز', data.cards.openAlerts],
    ['هشدار بحرانی', data.cards.criticalAlerts],
    ['راننده آماده', data.cards.readyDrivers],
    ['راننده مشغول', data.cards.busyDrivers],
  ];
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
