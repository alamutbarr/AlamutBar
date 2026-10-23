const jwt = require('jsonwebtoken');
const { WebSocketServer } = require('ws');
const { Shipment, Message } = require('./models');
const { roleOf, present } = require('./routes/chatRoutes');

const rooms = new Map();

function room(shipmentId) {
  const key = String(shipmentId);
  if (!rooms.has(key)) rooms.set(key, new Set());
  return rooms.get(key);
}

function broadcast(shipmentId, payload) {
  const data = JSON.stringify(payload);
  for (const client of room(shipmentId)) {
    if (client.readyState === 1) client.send(data);
  }
}

function attachChat(server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (socket, request) => {
    let user = null;
    try {
      const url = new URL(request.url, 'http://127.0.0.1');
      const token = url.searchParams.get('token');
      user = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      socket.close(4401, 'unauthorized');
      return;
    }

    socket.on('message', async (raw) => {
      let packet;
      try {
        packet = JSON.parse(String(raw));
      } catch {
        return;
      }

      if (packet.type === 'join') {
        const shipment = await Shipment.findByPk(packet.shipmentId);
        if (!shipment || !roleOf(user, shipment)) {
          socket.send(JSON.stringify({ type: 'error', error: 'به این گفتگو دسترسی ندارید.' }));
          return;
        }
        if (socket.shipmentId) room(socket.shipmentId).delete(socket);
        socket.shipmentId = String(shipment.id);
        room(shipment.id).add(socket);
        const history = await Message.findAll({
          where: { shipment_id: shipment.id },
          order: [['createdAt', 'ASC']],
        });
        socket.send(JSON.stringify({ type: 'history', messages: history.map(present) }));
        return;
      }

      if (packet.type === 'message') {
        const text = String(packet.body || '').trim();
        if (!text || text.length > 2000) return;
        const shipment = await Shipment.findByPk(packet.shipmentId);
        const senderRole = shipment && roleOf(user, shipment);
        if (!senderRole) {
          socket.send(JSON.stringify({ type: 'error', error: 'به این گفتگو دسترسی ندارید.' }));
          return;
        }
        const saved = await Message.create({
          shipment_id: shipment.id,
          sender_role: senderRole,
          sender_id: user.id,
          body: text,
        });
        broadcast(shipment.id, { type: 'message', message: present(saved) });
      }
    });

    socket.on('close', () => {
      if (socket.shipmentId) room(socket.shipmentId).delete(socket);
    });
  });
}

module.exports = { attachChat };
