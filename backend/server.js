const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 9010 });

console.log('WebSocket server started on ws://192.168.1.4:9010');

const clients = new Map();

wss.on('connection', (ws) => {
  console.log('New WebSocket connection');

  ws.on('message', (msg) => {
    let parsed;
    try {
      parsed = JSON.parse(msg);
    } catch (e) {
      console.error(' Error parsing JSON:', e);
      console.log(' Non-JSON message:', msg);
      return;
    }

    console.log('Received message:', parsed);

    const { type, role, data, target } = parsed;

    if (type === 'register') {
      clients.set(ws, role);
      console.log(`Client registered as ${role}`);
      console.log(clients);
    }

    if (type === 'robot-message') {
      for (let [client, role] of clients.entries()) {
        if (client.readyState === WebSocket.OPEN && role === 'viewer') {
          client.send(`Message from robot: ${data}`);
        }
      }
    }

    if (type === 'viewer-request') {
      for (let [client, r] of clients.entries()) {
        if (r === 'robot') {
          client.send(JSON.stringify({ type: 'viewer-request', from: 'viewer' }));
        }
      }
    }

    if (type === 'offer' || type === 'answer' || type === 'ice') {
      for (let [client, r] of clients.entries()) {
        if ((type === 'offer' && r === 'robot') || (type !== 'offer' && r === 'viewer')) {
          console.log("message in offer loop");
          client.send(JSON.stringify({ type, data }));
        }
      }
    }
  });

  ws.on('close', () => {
    console.log('WebSocket client disconnected');
    clients.delete(ws);
  });
});
