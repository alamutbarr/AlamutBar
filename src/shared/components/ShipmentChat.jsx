import { useEffect, useRef, useState } from 'react';

function socketUrl(token) {
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${window.location.host}/ws?token=${encodeURIComponent(token)}`;
}

const ROLE_LABEL = { owner: 'صاحب کالا', driver: 'راننده', operator: 'اپراتور' };

async function readJson(response) {
  return response.json().catch(() => ({}));
}

async function restHistory({ shipmentId, channel, token, mine }) {
  const headers = { Authorization: `Bearer ${token}` };
  const path = mine === 'operator'
    ? `/api/admin/chats/${shipmentId}?channel=${encodeURIComponent(channel)}`
    : `/api/chat/${shipmentId}?channel=${encodeURIComponent(channel)}`;
  const response = await fetch(path, { headers });
  const json = await readJson(response);
  if (!response.ok) throw new Error(json.error || json.message || 'خواندن گفتگو ناموفق بود.');
  if (Array.isArray(json.data)) return json.data;
  if (Array.isArray(json.messages)) return json.messages;
  return [];
}

async function restSend({ shipmentId, channel, token, mine, body }) {
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const path = mine === 'operator' ? `/api/admin/chats/${shipmentId}` : `/api/chat/${shipmentId}`;
  const response = await fetch(path, {
    method: 'POST',
    headers,
    body: JSON.stringify({ channel, body }),
  });
  const json = await readJson(response);
  if (!response.ok) throw new Error(json.error || json.message || 'ارسال پیام ناموفق بود.');
  return json.data || json.message;
}

export default function ShipmentChat({ shipmentId, token, enabled, mine, channel = 'owner_operator', title = 'گفتگو با اپراتور' }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [notice, setNotice] = useState('');
  const [live, setLive] = useState(false);
  const socketRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (!enabled || !token || !shipmentId) return undefined;
    let closed = false;
    let socket;
    let reconnectTimer;

    const append = (message) => {
      if (!message?.id) return;
      setMessages((current) => (current.some((item) => item.id === message.id) ? current : [...current, message]));
    };

    const loadHistory = () => {
      restHistory({ shipmentId, channel, token, mine })
        .then((rows) => {
          if (!closed) setMessages(rows);
        })
        .catch((error) => {
          if (!closed) setNotice(error.message);
        });
    };

    const connect = () => {
      socket = new WebSocket(socketUrl(token));
      socketRef.current = socket;
      socket.onopen = () => {
        if (closed) return;
        setLive(true);
        setNotice('');
        socket.send(JSON.stringify({ type: 'join', shipmentId, channel }));
      };
      socket.onmessage = (event) => {
        const packet = JSON.parse(event.data);
        if (packet.type === 'history') setMessages(packet.messages || []);
        if (packet.type === 'message') append(packet.message);
        if (packet.type === 'error') setNotice(packet.error);
      };
      socket.onclose = () => {
        if (closed) return;
        setLive(false);
        reconnectTimer = window.setTimeout(connect, 4000);
      };
    };

    loadHistory();
    connect();

    return () => {
      closed = true;
      window.clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, [enabled, token, shipmentId, channel, mine]);

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages]);

  if (!enabled) {
    return (
      <section className="shipment-chat shipment-chat--idle">
        گفتگو با اپراتور بعد از قبول بار باز می‌شود.
      </section>
    );
  }

  const send = async (event) => {
    event.preventDefault();
    const body = text.trim();
    if (!body) return;
    setNotice('');
    const socket = socketRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'message', shipmentId, channel, body }));
      setText('');
      return;
    }
    try {
      const message = await restSend({ shipmentId, channel, token, mine, body });
      if (message?.id) {
        setMessages((current) => (current.some((item) => item.id === message.id) ? current : [...current, message]));
      }
      setText('');
    } catch (error) {
      setNotice(error.message);
    }
  };

  return (
    <section className="shipment-chat">
      <header className="shipment-chat__head">
        <h2>{title}</h2>
        <span>{live ? 'آنلاین' : 'در حال اتصال'}</span>
      </header>
      <div ref={listRef} className="shipment-chat__list">
        {messages.length === 0 && (
          <p className="shipment-chat__empty">هنوز پیامی رد و بدل نشده.</p>
        )}
        {messages.map((message) => {
          const own = message.senderRole === mine;
          return (
            <div key={message.id} className={`shipment-chat__bubble ${own ? 'is-own' : 'is-other'}`}>
              <p className="shipment-chat__meta">{ROLE_LABEL[message.senderRole] || 'پیام'}</p>
              <p>{message.body}</p>
            </div>
          );
        })}
      </div>
      {notice && <p className="shipment-chat__notice">{notice}</p>}
      <form onSubmit={send} className="shipment-chat__form">
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="پیام بنویسید"
        />
        <button type="submit">ارسال</button>
      </form>
    </section>
  );
}
