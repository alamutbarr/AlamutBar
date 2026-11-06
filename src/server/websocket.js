const jwt = require('jsonwebtoken');
const { WebSocketServer } = require('ws');
const { Shipment } = require('./models');
const chat = require('./chat/service');

const rooms = new Map();

function roomKey(shipmentId, channel) {
  return `${shipmentId}:${channel}`;
}

function room(shipmentId, channel) {
  const key = roomKey(shipmentId, channel);
  if (!rooms.has(key)) rooms.set(key, new Set());
  return rooms.get(key);
}

function broadcast(shipmentId, channel, payload) {
  const data = JSON.stringify(payload);
  for (const client of room(shipmentId, channel)) {
    if (client.readyState === 1) client.send(data);
  }
}

function attachChat() {
  const wss = new WebSocketServer({ noServer: true });

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
      const channel = packet.channel === 'driver_operator' ? 'driver_operator' : 'owner_operator';
      if (packet.type === 'join') {
        const shipment = await Shipment.findByPk(packet.shipmentId);
        const party = shipment && chat.partyOf(user, shipment, channel);
        if (!party) {
          socket.send(JSON.stringify({ type: 'error', error: 'به این گفتگو دسترسی ندارید.' }));
          return;
        }
        if (socket.roomKey) room(socket.shipmentId, socket.channel).delete(socket);
        socket.shipmentId = String(shipment.id);
        socket.channel = channel;
        socket.roomKey = roomKey(shipment.id, channel);
        socket.party = party;
        room(shipment.id, channel).add(socket);
        const messages = await chat.history(shipment.id, channel);
        socket.send(JSON.stringify({ type: 'history', channel, messages }));
        return;
      }

      if (packet.type === 'message') {
        const shipment = await Shipment.findByPk(packet.shipmentId);
        const party = shipment && chat.partyOf(user, shipment, channel);
        if (!party) {
          socket.send(JSON.stringify({ type: 'error', error: 'به این گفتگو دسترسی ندارید.' }));
          return;
        }
        try {
          const message = await chat.postMessage({
            shipment,
            channel,
            senderRole: party,
            senderId: user.id,
            body: packet.body,
          });
          broadcast(shipment.id, channel, { type: 'message', message });
        } catch (error) {
          socket.send(JSON.stringify({ type: 'error', error: error.message }));
        }
      }
    });

    socket.on('close', () => {
      if (socket.shipmentId && socket.channel) room(socket.shipmentId, socket.channel).delete(socket);
    });
  });
  return wss;
}

module.exports = { attachChat };
