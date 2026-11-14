require('dotenv').config();

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is not set. Add it to backend/.env');
}

const http = require('http');
const app = require('./app');
const realtime = require('./realtime/hub');
const { connectDatabase } = require('./config/database');

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await connectDatabase();

    const server = http.createServer(app);

    // WebSockets share the same HTTP server and port (path: /ws)
    realtime.attach(server);

    server.listen(PORT, () => {
      console.log(`Backend server running on http://localhost:${PORT}`);
    });

    // Close cleanly when Docker or the terminal asks the process to stop
    const shutdown = () => {
      realtime.close();
      server.close(() => process.exit(0));
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();