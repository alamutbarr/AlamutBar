import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api, getAccess } from '../api';
import { Page, SkeletonRows } from '../components/ui';
import ShipmentChat from '../../../shared/components/ShipmentChat';

const CHANNELS = [
  ['owner_operator', 'صاحب کالا'],
  ['driver_operator', 'راننده'],
];

function lastPreview(row, channel) {
  return row.channels?.[channel]?.body || '';
}

function lastTime(row) {
  const ownerAt = row.channels?.owner_operator?.createdAt;
  const driverAt = row.channels?.driver_operator?.createdAt;
  const stamp = [ownerAt, driverAt].filter(Boolean).sort().at(-1);
  if (!stamp) return 'بدون پیام';
  try {
    return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(stamp));
  } catch {
    return '—';
  }
}

export default function Chats() {
  const [rows, setRows] = useState(null);
  const [selected, setSelected] = useState(null);
  const [channel, setChannel] = useState('owner_operator');

  useEffect(() => {
    api('/chats').then((data) => {
      const list = data || [];
      setRows(list);
      if (list[0]) setSelected(list[0]);
    }).catch((error) => toast.error(error.message));
  }, []);

  if (!rows) return <SkeletonRows />;

  return (
    <Page title="گفتگوها">
      <div className="chat-split">
        <article className="card chat-inbox">
          {rows.map((row) => {
            const preview = lastPreview(row, channel) || lastPreview(row, 'owner_operator') || lastPreview(row, 'driver_operator');
            return (
              <button
                key={row.id}
                type="button"
                onClick={() => setSelected(row)}
                className={`chat-inbox__row${selected?.id === row.id ? ' is-active' : ''}`}
              >
                <strong>{row.trackingCode}</strong>
                <span className="muted">{lastTime(row)}</span>
                <div className="muted">صاحب کالا: {row.ownerPhone || '—'} · راننده: {row.driverName || 'هنوز تعیین نشده'}</div>
                {preview && <p className="chat-inbox__preview">{preview}</p>}
              </button>
            );
          })}
          {!rows.length && <p className="muted">گفتگویی ثبت نشده. با انتخاب بار می‌توانید به صاحب کالا یا راننده پیام بدهید.</p>}
        </article>
        <article className="card chat-thread">
          {selected ? (
            <>
              <div className="chat-thread__switch">
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
