const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/user.model');
const { connectTestDb } = require('./helpers/db');

const TEST_EMAILS = { $regex: '@auth-test\\.eventhub$' };
const emailFor = (name) => `${name}@auth-test.eventhub`;

const validUser = (name) => ({
  name: 'Alice Tan',
  email: emailFor(name),
  password: 'password123'
});

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
  await connectTestDb();
  await User.init(); // make sure the unique email index exists
  await User.deleteMany({ email: TEST_EMAILS });
}, 30000);

afterAll(async () => {
  await User.deleteMany({ email: TEST_EMAILS });
  await mongoose.disconnect();
});

describe('POST /api/auth/register', () => {
  it('creates an attendee and never returns the password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(validUser('reg1'));

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe(emailFor('reg1'));
    expect(res.body.data.role).toBe('attendee');
    expect(res.body.data.password).toBeUndefined();
  });

  it('ignores a role sent in the body (no privilege escalation)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validUser('reg2'), role: 'organiser' });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.role).toBe('attendee');

    const saved = await User.findOne({ email: emailFor('reg2') });
    expect(saved.role).toBe('attendee');
  });

  it('stores a hashed password, not plain text', async () => {
    await request(app).post('/api/auth/register').send(validUser('reg3'));

    const saved = await User.findOne({ email: emailFor('reg3') }).select(
      '+password'
    );

    expect(saved.password).not.toBe('password123');
    expect(saved.password).toMatch(/^\$2[aby]\$/);
  });

  it('returns 409 for a duplicate email', async () => {
    await request(app).post('/api/auth/register').send(validUser('dup'));

    const res = await request(app)
      .post('/api/auth/register')
      .send(validUser('dup'));

    expect(res.statusCode).toBe(409);
  });

  it.each([
    ['a password that is too short', { password: 'short' }],
    ['an invalid email', { email: 'not-an-email' }],
    ['a missing name', { name: '' }]
  ])('returns 400 for %s', async (_label, override) => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validUser('bad'), ...override });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('POST /api/auth/login', () => {
  beforeAll(async () => {
    await request(app).post('/api/auth/register').send(validUser('login1'));
  });

  it('returns a token and the user on success', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: emailFor('login1'), password: 'password123' });

    expect(res.statusCode).toBe(200);
    expect(typeof res.body.data.token).toBe('string');
    expect(res.body.data.user.role).toBe('attendee');
    expect(res.body.data.user.password).toBeUndefined();
  });

  it('returns 401 for a wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: emailFor('login1'), password: 'wrong-password' });

    expect(res.statusCode).toBe(401);
  });

  it('returns the same 401 message for an unknown email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: emailFor('nobody'), password: 'password123' });

    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe('Invalid email or password');
  });

  it('returns 400 for a NoSQL-injection style payload', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: { $ne: null }, password: { $ne: null } });

    expect(res.statusCode).toBe(400);
  });
});

describe('GET /api/auth/me', () => {
  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.statusCode).toBe(401);
  });

  it('returns the logged-in user with a valid token', async () => {
    await request(app).post('/api/auth/register').send(validUser('me1'));

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: emailFor('me1'), password: 'password123' });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${login.body.data.token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.email).toBe(emailFor('me1'));
  });

  it('reports the organiser role for an organiser account', async () => {
    await User.create({
      name: 'Org Test',
      email: emailFor('org1'),
      password: 'password123',
      role: 'organiser'
    });

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: emailFor('org1'), password: 'password123' });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${login.body.data.token}`);

    expect(res.body.data.role).toBe('organiser');
  });
});