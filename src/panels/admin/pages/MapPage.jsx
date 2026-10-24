import { useEffect, useState } from 'react';
import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet';
import { toast } from 'sonner';
import { api, getAccess } from '../api';
import { statusTone } from '../../../design/tokens';
import { ALERT_LABELS, when } from '../format';
import { Badge, Page, SkeletonRows } from '../components/ui';

export default function MapPage() {
  const [vehicles, setVehicles] = useState(null);
  const load = () => api('/map').then(setVehicles);
  useEffect(() => {
    load().catch((error) => toast.error(error.message));
    const token = getAccess();
    if (!token) return undefined;
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const socket = new WebSocket(`${protocol}://${window.location.host}/ws/admin?token=${token}`);
    socket.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      if (payload.type === 'location') {
        setVehicles((current) => {
          const list = current || [];
          const index = list.findIndex((item) => item.id === payload.vehicle.id);
          if (index === -1) return [...list, payload.vehicle];
          const next = [...list];
          next[index] = { ...next[index], ...payload.vehicle };
          return next;
        });
      }
    };
    return () => socket.close();
  }, []);
  if (!vehicles) return <SkeletonRows />;
  return (
    <Page title="نقشه زنده">
      <div className="split">
        <div className="card map-shell">
          <MapContainer center={[34.8, 53.5]} zoom={5}>
            <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {vehicles.filter((item) => item.lastLocation).map((item) => (
              <CircleMarker key={item.id} center={[item.lastLocation.lat, item.lastLocation.lng]} radius={10} pathOptions={{ color: statusTone[item.tone] || statusTone.progress, fillOpacity: 0.85 }}>
                <Popup>
                  <strong>{item.fullName}</strong>
                  <div>{item.shipment?.trackingCode}</div>
                  <div>{item.isGpsActive ? 'GPS فعال' : 'آخرین موقعیت معتبر'}</div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
        <div style={{ display: 'grid', gap: 8, alignContent: 'start' }}>
          {vehicles.map((item) => (
            <article key={item.id} className="card" style={{ padding: 12 }}>
              <strong>{item.fullName}</strong>
              <div className="muted">{item.plate} — {item.shipment?.origin} به {item.shipment?.destination}</div>
              <div>آخرین موقعیت: {when(item.lastLocationAt)}</div>
              <Badge tone={item.tone === 'crit' ? 'crit' : item.tone === 'warn' ? 'warn' : 'progress'}>{item.isGpsActive ? 'زنده' : 'قطع GPS'}</Badge>
            </article>
          ))}
          {vehicles.length === 0 && <p className="muted">خودروی فعالی روی نقشه نیست.</p>}
        </div>
      </div>
    </Page>
  );
}

export function AlertsPage() {
  const [rows, setRows] = useState(null);
  const [action, setAction] = useState('');
  const [selected, setSelected] = useState(null);
  const load = () => api('/alerts?resolved=false').then((data) => setRows(data.items));
  useEffect(() => { load().catch((error) => toast.error(error.message)); }, []);
  if (!rows) return <SkeletonRows />;
  return (
    <Page title="هشدارها">
      <div style={{ display: 'grid', gap: 10 }}>
        {rows.map((alert) => (
          <article key={alert.id} className="card" style={{ padding: 14 }}>
            <Badge tone={alert.severity === 'critical' ? 'crit' : 'warn'}>{ALERT_LABELS[alert.type] || alert.type}</Badge>
            <p>{alert.message}</p>
            <p className="muted">{alert.trackingCode} — {alert.driverName} — {when(alert.createdAt)}</p>
            <button type="button" className="btn" onClick={() => setSelected(alert.id)}>رسیدگی شد</button>
            {selected === alert.id && (
              <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                <textarea className="area" value={action} onChange={(event) => setAction(event.target.value)} placeholder="چه اقدامی انجام شد؟" />
                <button type="button" className="btn gold" onClick={async () => {
                  try {
                    await api(`/alerts/${alert.id}/resolve`, { method: 'POST', body: { action } });
                    toast.success('ثبت شد');
                    setAction('');
                    setSelected(null);
                    load();
                  } catch (error) { toast.error(error.message); }
                }}>ثبت اقدام</button>
              </div>
            )}
          </article>
        ))}
        {rows.length === 0 && <p className="muted">هشدار بازی نیست.</p>}
      </div>
    </Page>
  );
}
