const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const eventRoutes = require('./routes/event.routes');
const authRoutes = require('./routes/auth.routes');
const registrationRoutes = require('./routes/registration.routes');

const app = express();

app.use(
  cors({
    origin: 'http://localhost:4200'
  })
);

app.use(express.json());

// Shown by /api/health, so a deployment can prove which version is answering.
// Set APP_VERSION when starting the container.
const appVersion = process.env.APP_VERSION || require('../package.json').version;

// Liveness: the process is up
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Event Management API is running',
    version: appVersion,
    uptimeSeconds: Math.round(process.uptime())
  });
});

// Readiness: is it safe to send traffic here?
// (database connected, and the server is not in the middle of shutting down)
app.get('/api/ready', (req, res) => {
  const databaseUp = mongoose.connection.readyState === 1;
  const shuttingDown = Boolean(app.locals.shuttingDown);
  const ready = databaseUp && !shuttingDown;

  res.status(ready ? 200 : 503).json({
    status: ready ? 'ready' : 'not-ready',
    database: databaseUp ? 'up' : 'down',
    shuttingDown
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/registrations', registrationRoutes);

module.exports = app;