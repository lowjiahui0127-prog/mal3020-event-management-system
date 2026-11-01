require('dotenv').config();

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is not set. Add it to backend/.env');
}

const http = require('http');
const app = require('./app');
const { connectDatabase } = require('./config/database');

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await connectDatabase();

    const server = http.createServer(app);

    server.listen(PORT, () => {
      console.log(
        `Backend server running on http://localhost:${PORT}`
      );
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();
