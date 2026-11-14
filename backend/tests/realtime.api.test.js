const http = require('http');
const request = require('supertest');
const mongoose = require('mongoose');
const { WebSocket } = require('ws');
const app = require('../src/app');
const realtime = require('../src/realtime/hub');
const Event = require('../src/models/event.model');
const User = require('../src/models/user.model');
const Registration = require('../src/models/registration.model');
const { signToken } = require('../src/utils/token');
const { connectTestDb } = require('./helpers/db');

const TEST_EMAILS = { $regex: '@rt-test\\.eventhub$' };
const HOUR = 60 * 60 * 1000;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const bearer = (token) => ({ Authorization: `Bearer ${token}` });

let server;
let port;
let owner;
let otherOrganiser;
let attendees;
let ownerToken;
let otherToken;
let attendeeTokens;
const clients = [];

// A tiny WebSocket client that records every message it receives
function openClient() {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    const inbox = [];
    let pending = null;

    const flush = () => {
      if (!pending) return;

      const index = inbox.findIndex((message) => pending.types.includes(message.type));
      if (index === -1) return;

      const [message] = inbox.splice(index, 1);
      clearTimeout(pending.timer);
      const { done } = pending;
      pending = null;
      done(message);
    };

    socket.on('message', (raw) => {
      inbox.push(JSON.parse(raw.toString()));
      flush();
    });

    socket.once('error', reject);

    socket.once('open', () =>
      resolve({
        socket,
        inbox,
        send: (message) => socket.send(JSON.stringify(message)),
        close: () => socket.close(),
        waitFor: (types, timeout = 3000) =>
          new Promise((done, fail) => {
            pending = {
              types: [].concat(types),
              done,
              timer: setTimeout(() => {
                pending = null;
                fail(new Error(`Timed out waiting for ${[].concat(types).join(' / ')}`));
              }, timeout)
            };
            flush();
          })
      })
    );
  });
}

async function connect() {
  const client = await openClient();
  clients.push(client);
  return client;
}

async function authenticate(client, token) {
  client.send({ type: 'auth', token });
  return client.waitFor(['auth:ok', 'auth:error']);
}

const createEvent = (overrides = {}) =>
  Event.create({
    title: 'Realtime Test Event',
    description: 'Used by realtime tests',
    date: new Date(Date.now() + 24 * HOUR),
    endDate: new Date(Date.now() + 26 * HOUR),
    location: 'Hall A',
    capacity: 5,
    status: 'published',
    createdBy: owner._id,
    ...overrides
  });

const registerFor = (event, token) =>
  request(app)
    .post('/api/registrations')
    .set(bearer(token))
    .send({ eventId: String(event._id) });

const hasType = (client, type) => client.inbox.some((message) => message.type === type);

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
  await connectTestDb();
  await User.deleteMany({ email: TEST_EMAILS });

  [owner, otherOrganiser] = await User.create([
    {
      name: 'RT Owner',
      email: 'owner@rt-test.eventhub',
      password: 'password123',
      role: 'organiser'
    },
    {
      name: 'RT Other Organiser',
      email: 'other@rt-test.eventhub',
      password: 'password123',
      role: 'organiser'
    }
  ]);

  attendees = await User.create(
    [0, 1].map((n) => ({
      name: `RT Attendee ${n}`,
      email: `attendee${n}@rt-test.eventhub`,
      password: 'password123',
      role: 'attendee'
    }))
  );

  ownerToken = signToken(owner);
  otherToken = signToken(otherOrganiser);
  attendeeTokens = attendees.map((user) => signToken(user));

  await Event.init();
  await Registration.init();

  // A real server, so the tests use real WebSocket connections
  server = http.createServer(app);
  realtime.attach(server);
  await new Promise((resolve) => server.listen(0, resolve));
  port = server.address().port;
}, 30000);

afterEach(async () => {
  clients.splice(0).forEach((client) => client.close());
  await Registration.deleteMany({});
  await Event.deleteMany({});
});

afterAll(async () => {
  realtime.close();
  await new Promise((resolve) => server.close(resolve));
  await User.deleteMany({ email: TEST_EMAILS });
  await mongoose.disconnect();
});

describe('public seat counts', () => {
  it('sends seat counts to anonymous clients but no attendee details', async () => {
    const event = await createEvent();
    const anonymous = await connect();

    await registerFor(event, attendeeTokens[0]).expect(201);

    const counts = await anonymous.waitFor('event:counts');

    expect(counts.data).toEqual({
      eventId: String(event._id),
      registeredCount: 1,
      capacity: 5
    });

    await delay(200);
    expect(hasType(anonymous, 'registration:created')).toBe(false);
  });

  it('announces a new capacity when the organiser edits it', async () => {
    const event = await createEvent();
    const anonymous = await connect();

    await request(app)
      .put(`/api/events/${event._id}`)
      .set(bearer(ownerToken))
      .send({ capacity: 12 })
      .expect(200);

    const counts = await anonymous.waitFor('event:counts');
    expect(counts.data.capacity).toBe(12);
  });

  it('does not announce draft events', async () => {
    const event = await createEvent({ status: 'draft' });
    const anonymous = await connect();

    await request(app)
      .put(`/api/events/${event._id}`)
      .set(bearer(ownerToken))
      .send({ capacity: 9 })
      .expect(200);

    await delay(200);
    expect(anonymous.inbox).toHaveLength(0);
  });
});

describe('private registration updates', () => {
  it('tells the owning organiser who registered', async () => {
    const event = await createEvent();
    const ownerClient = await connect();

    expect((await authenticate(ownerClient, ownerToken)).type).toBe('auth:ok');

    await registerFor(event, attendeeTokens[0]).expect(201);

    const message = await ownerClient.waitFor('registration:created');

    expect(message.data.user).toMatchObject({
      name: 'RT Attendee 0',
      email: 'attendee0@rt-test.eventhub'
    });
    expect(message.data.event.title).toBe('Realtime Test Event');
  });

  it('does not tell other organisers or attendees', async () => {
    const event = await createEvent();
    const otherClient = await connect();
    const attendeeClient = await connect();

    await authenticate(otherClient, otherToken);
    await authenticate(attendeeClient, attendeeTokens[1]);

    await registerFor(event, attendeeTokens[0]).expect(201);

    // Both still get the public count, so the broadcast definitely happened
    await otherClient.waitFor('event:counts');
    await attendeeClient.waitFor('event:counts');
    await delay(200);

    expect(hasType(otherClient, 'registration:created')).toBe(false);
    expect(hasType(attendeeClient, 'registration:created')).toBe(false);
  });

  it('tells the owner when a registration is cancelled', async () => {
    const event = await createEvent();
    const registered = await registerFor(event, attendeeTokens[0]).expect(201);

    const ownerClient = await connect();
    await authenticate(ownerClient, ownerToken);

    await request(app)
      .patch(`/api/registrations/${registered.body.data._id}/cancel`)
      .set(bearer(attendeeTokens[0]))
      .expect(200);

    const cancelled = await ownerClient.waitFor('registration:cancelled');
    const counts = await ownerClient.waitFor('event:counts');

    expect(cancelled.data.status).toBe('cancelled');
    expect(cancelled.data.user.name).toBe('RT Attendee 0');
    expect(counts.data.registeredCount).toBe(0);
  });
});

describe('authentication and robustness', () => {
  it('rejects an invalid token but keeps the public channel working', async () => {
    const event = await createEvent();
    const client = await connect();

    const reply = await authenticate(client, 'not-a-real-token');
    expect(reply.type).toBe('auth:error');

    await registerFor(event, attendeeTokens[0]).expect(201);

    await client.waitFor('event:counts');
    await delay(200);
    expect(hasType(client, 'registration:created')).toBe(false);
  });

  it('ignores malformed messages without crashing', async () => {
    const client = await connect();

    client.socket.send('this is not json');
    client.socket.send(JSON.stringify({ type: 'something-else' }));

    const reply = await authenticate(client, ownerToken);
    expect(reply.type).toBe('auth:ok');
  });
});