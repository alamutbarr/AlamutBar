import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api, getAccess } from '../api';
import { Page, SkeletonRows } from '../components/ui';
import ShipmentChat from '../../../shared/components/ShipmentChat';

const CHANNELS = [
  ['owner_operator', 'صاحب کالا'],
  ['driver_operator', 'راننده'],
];

export default function Chats() {
  const [rows, setRows] = useState(null);
  const [selected, setSelected] = useState(null);
  const [channel, setChannel] = useState('owner_operator');

  useEffect(() => {
    api('/chats').then((data) => {
      setRows(data || []);
      if (data?.[0]) setSelected(data[0]);
    }).catch((error) => toast.error(error.message));
  }, []);

  if (!rows) return <SkeletonRows />;

  return (
    <Page title="گفتگوها">
      <div className="split">
        <article className="card" style={{ padding: 12 }}>
          {rows.map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={() => setSelected(row)}
              className="nav-link"
              style={{ display: 'block', width: '100%', textAlign: 'right', background: selected?.id === row.id ? 'var(--alamut-mist)' : 'transparent' }}
            >
              <strong>{row.trackingCode}</strong>
              <div className="muted">صاحب کالا: {row.ownerPhone || '—'} · راننده: {row.driverName || 'هنوز تعیین نشده'}</div>
            </button>
          ))}
          {!rows.length && <p className="muted">گفتگویی ثبت نشده. با انتخاب بار می‌توانید به صاحب کالا یا راننده پیام بدهید.</p>}
        </article>
        <article className="card" style={{ padding: 12 }}>
          {selected ? (
            <>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                {CHANNELS.map(([key, label]) => (
                  <button key={key} type="button" className={channel === key ? 'btn' : 'btn secondary'} onClick={() => setChannel(key)}>
                    گفتگو با {label}
                  </button>
                ))}
              </div>
              <p className="muted">بار {selected.trackingCode}</p>
              <ShipmentChat
                key={`${selected.id}:${channel}`}
                shipmentId={selected.id}
                token={getAccess()}
                enabled
                mine="operator"
                channel={channel}
                title={channel === 'driver_operator' ? 'گفتگو با راننده' : 'گفتگو با صاحب کالا'}
              />
            </>
          ) : <p className="muted">یک بار را انتخاب کنید.</p>}
        </article>
      </div>
    </Page>
  );
}
