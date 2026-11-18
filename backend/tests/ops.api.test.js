const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const { connectTestDb } = require('./helpers/db');

beforeAll(async () => {
  await connectTestDb();
}, 30000);

afterAll(async () => {
  app.locals.shuttingDown = false;
  await mongoose.disconnect();
});

describe('GET /api/health', () => {
  it('reports that the process is running and which version it is', async () => {
    const res = await request(app).get('/api/health');

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(typeof res.body.version).toBe('string');
  });
});

describe('GET /api/ready', () => {
  it('is ready when the database is connected', async () => {
    const res = await request(app).get('/api/ready');

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ status: 'ready', database: 'up' });
  });

  it('answers 503 while shutting down, so the proxy stops sending traffic', async () => {
    app.locals.shuttingDown = true;

    try {
      const res = await request(app).get('/api/ready');

      expect(res.statusCode).toBe(503);
      expect(res.body.shuttingDown).toBe(true);
    } finally {
      app.locals.shuttingDown = false;
    }
  });
});