// Test helper for the rollover test: connects through the proxy, then reports
// what happens while the backend is replaced.
const { WebSocket } = require('ws');

const target = process.env.TARGET || 'ws://frontend:8080/ws';
const timeoutMs = Number(process.env.PROBE_TIMEOUT_MS || 120000);

let opened = 0;

function connect() {
  const socket = new WebSocket(target);

  socket.on('open', () => {
    opened += 1;
    console.log(`open #${opened}`);

    if (opened >= 2) {
      console.log('reconnected');
      setTimeout(() => process.exit(0), 200);
    }
  });

  socket.on('close', (code) => {
    console.log(`close ${code}`);
    setTimeout(connect, 500);
  });

  socket.on('error', (error) => console.log(`error ${error.message}`));
}

connect();

setTimeout(() => {
  console.log('timeout');
  process.exit(1);
}, timeoutMs);