require('dotenv').config();

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is not set. Add it to backend/.env');
}

const http = require('http');
const mongoose = require('mongoose');
const app = require('./app');
const realtime = require('./realtime/hub');
const { connectDatabase } = require('./config/database');

const PORT = process.env.PORT || 3000;

// Docker waits 30 s after SIGTERM before killing the container (stop_grace_period)
const DRAIN_TIMEOUT_MS = 25000;

// Graceful shutdown: finish what is in progress, then exit.
function registerGracefulShutdown(server) {
  let shuttingDown = false;

  const shutdown = (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;

    console.log(`${signal} received: draining before exit`);

    // 1. /api/ready now answers 503, so nothing new is routed here
    app.locals.shuttingDown = true;

    // 2. WebSocket clients are told to reconnect (they will reach the new container)
    realtime.closeAll(1001, 'Server restarting');

    // 3. Stop accepting connections and wait for requests that are already running
    server.close(async () => {
      await mongoose.disconnect().catch(() => undefined);
      console.log('Drained: all requests finished');
      process.exit(0);
    });
    server.closeIdleConnections();

    // 4. Safety net: never hang forever
    setTimeout(() => {
      console.error('Drain timed out, exiting');
      process.exit(1);
    }, DRAIN_TIMEOUT_MS).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

async function startServer() {
  try {
    await connectDatabase();

    const server = http.createServer(app);

    // WebSockets share the same HTTP server and port (path: /ws)
    realtime.attach(server);

    server.listen(PORT, () => {
      console.log(`Backend server running on http://localhost:${PORT}`);
    });

    registerGracefulShutdown(server);
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();