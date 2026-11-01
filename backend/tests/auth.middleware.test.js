jest.mock('../src/models/user.model', () => ({ findById: jest.fn() }));

process.env.JWT_SECRET = 'test-secret';

const express = require('express');
const request = require('supertest');
const User = require('../src/models/user.model');
const { authenticate, authorize } = require('../src/middleware/auth.middleware');
const { signToken } = require('../src/utils/token');

const app = express();
app.get('/any-user', authenticate, (_req, res) => res.json({ ok: true }));
app.get('/organiser-only', authenticate, authorize('organiser'), (_req, res) =>
  res.json({ ok: true })
);

const tokenFor = (role) => signToken({ _id: 'user-1', role });
const mockUser = (role) =>
  User.findById.mockResolvedValue({ _id: 'user-1', role });

beforeEach(() => User.findById.mockReset());

describe('authenticate', () => {
  it('returns 401 when no token is sent', async () => {
    const res = await request(app).get('/any-user');
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns 401 when the token is invalid', async () => {
    const res = await request(app)
      .get('/any-user')
      .set('Authorization', 'Bearer not-a-real-token');
    expect(res.statusCode).toBe(401);
  });

  it('returns 401 when the account no longer exists', async () => {
    User.findById.mockResolvedValue(null);
    const res = await request(app)
      .get('/any-user')
      .set('Authorization', `Bearer ${tokenFor('attendee')}`);
    expect(res.statusCode).toBe(401);
  });

  it('allows a valid token', async () => {
    mockUser('attendee');
    const res = await request(app)
      .get('/any-user')
      .set('Authorization', `Bearer ${tokenFor('attendee')}`);
    expect(res.statusCode).toBe(200);
  });
});

describe('authorize', () => {
  it('returns 403 when an attendee calls an organiser-only route', async () => {
    mockUser('attendee');
    const res = await request(app)
      .get('/organiser-only')
      .set('Authorization', `Bearer ${tokenFor('attendee')}`);
    expect(res.statusCode).toBe(403);
  });

  it('allows an organiser on an organiser-only route', async () => {
    mockUser('organiser');
    const res = await request(app)
      .get('/organiser-only')
      .set('Authorization', `Bearer ${tokenFor('organiser')}`);
    expect(res.statusCode).toBe(200);
  });

  it('returns 401, not 403, when nobody is logged in', async () => {
    const res = await request(app).get('/organiser-only');
    expect(res.statusCode).toBe(401);
  });
});