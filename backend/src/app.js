const express = require('express');
const cors = require('cors');
const eventRoutes = require('./routes/event.routes');
const authRoutes = require('./routes/auth.routes');

const app = express();

app.use(cors({
  origin: 'http://localhost:4200'
}));

app.use(express.json());

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Event Management API is running'
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
module.exports = app;
