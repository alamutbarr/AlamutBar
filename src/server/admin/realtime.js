const sockets = new Set();

function addClient(socket) {
  sockets.add(socket);
}

function removeClient(socket) {
  sockets.delete(socket);
}

function publish(event) {
  const data = JSON.stringify({ ...event, at: new Date().toISOString() });
  for (const socket of sockets) {
    if (socket.readyState === 1) socket.send(data);
  }
}

function attachAdminSocket() {
  const jwt = require('jsonwebtoken');
  const { WebSocketServer } = require('ws');
  const wss = new WebSocketServer({ noServer: true });
  wss.on('connection', (socket, request) => {
    try {
      const url = new URL(request.url, 'http://127.0.0.1');
      const user = jwt.verify(url.searchParams.get('token'), process.env.JWT_SECRET);
      if (user.kind !== 'admin' || user.typ !== 'access') throw new Error('forbidden');
      addClient(socket);
      socket.on('close', () => removeClient(socket));
    } catch {
      socket.close(4401, 'unauthorized');
    }
  });
  return wss;
}

module.exports = { addClient, removeClient, publish, attachAdminSocket };
