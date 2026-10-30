import { useEffect, useRef, useState } from 'react';

function socketUrl(token) {
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${window.location.host}/ws?token=${encodeURIComponent(token)}`;
}

const ROLE_LABEL = { owner: 'صاحب کالا', driver: 'راننده', operator: 'اپراتور' };

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
    const socket = new WebSocket(socketUrl(token));
    socketRef.current = socket;

    socket.onopen = () => {
      if (closed) return;
      setLive(true);
      socket.send(JSON.stringify({ type: 'join', shipmentId, channel }));
    };
    socket.onmessage = (event) => {
      const packet = JSON.parse(event.data);
      if (packet.type === 'history') setMessages(packet.messages || []);
      if (packet.type === 'message') {
        setMessages((current) => (
          current.some((item) => item.id === packet.message.id) ? current : [...current, packet.message]
        ));
      }
      if (packet.type === 'error') setNotice(packet.error);
    };
    socket.onclose = () => {
      if (!closed) setLive(false);
    };

    return () => {
      closed = true;
      socket.close();
    };
  }, [enabled, token, shipmentId, channel]);

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages]);

  if (!enabled) {
    return (
      <section className="mt-4 rounded-2xl border border-[#d8e1dc] bg-white p-4 text-sm leading-7 text-[#526d70]">
        گفتگو با اپراتور بعد از قبول بار باز می‌شود.
      </section>
    );
  }

  const send = (event) => {
    event.preventDefault();
    const body = text.trim();
    const socket = socketRef.current;
    if (!body || !socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify({ type: 'message', shipmentId, channel, body }));
    setText('');
  };

  return (
    <section className="mt-4 overflow-hidden rounded-2xl border border-[#d8e1dc] bg-white">
      <header className="flex items-center justify-between border-b border-[#d8e1dc] px-4 py-3">
        <h2 className="text-sm font-bold text-[#17383b]">{title}</h2>
        <span className="text-xs text-[#526d70]">{live ? 'آنلاین' : 'در حال اتصال'}</span>
      </header>
      <div ref={listRef} className="flex h-72 flex-col gap-2 overflow-y-auto bg-[#f7f6f0] px-3 py-3">
        {messages.length === 0 && (
          <p className="m-auto text-center text-sm text-[#526d70]">هنوز پیامی رد و بدل نشده.</p>
        )}
        {messages.map((message) => {
          const own = message.senderRole === mine;
          return (
            <div key={message.id} className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-7 ${own ? 'self-start bg-[#17383b] text-[#f7f6f0]' : 'self-end border border-[#d8e1dc] bg-white text-[#17383b]'}`}>
              <p className="mb-1 text-[11px] opacity-70">{ROLE_LABEL[message.senderRole] || 'پیام'}</p>
              <p>{message.body}</p>
            </div>
          );
        })}
      </div>
      {notice && <p className="px-4 pt-2 text-xs text-red-600">{notice}</p>}
      <form onSubmit={send} className="flex gap-2 border-t border-[#d8e1dc] p-3">
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="پیام بنویسید"
          className="min-w-0 flex-1 rounded-xl border border-[#d8e1dc] bg-[#f7f6f0] px-3 py-2 text-sm outline-none focus:border-[#087f8c]"
        />
        <button type="submit" className="rounded-xl bg-[#087f8c] px-4 py-2 text-sm font-bold text-[#f7f6f0]">
          ارسال
        </button>
      </form>
    </section>
  );
}
