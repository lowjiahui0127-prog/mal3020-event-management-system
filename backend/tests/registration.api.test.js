const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const Event = require('../src/models/event.model');
const User = require('../src/models/user.model');
const Registration = require('../src/models/registration.model');
const { signToken } = require('../src/utils/token');
const { connectTestDb } = require('./helpers/db');

const TEST_EMAILS = { $regex: '@reg-test\\.eventhub$' };
const HOUR = 60 * 60 * 1000;

let organiser;
let attendees;
let organiserToken;
let tokens;

const bearer = (token) => ({ Authorization: `Bearer ${token}` });

const createEvent = (overrides = {}) =>
  Event.create({
    title: 'Registration Test Event',
    description: 'Used by registration tests',
    date: new Date(Date.now() + 24 * HOUR),
    endDate: new Date(Date.now() + 26 * HOUR),
    location: 'Hall A',
    capacity: 10,
    status: 'published',
    createdBy: organiser._id,
    ...overrides
  });

const register = (eventId, token) =>
  request(app)
    .post('/api/registrations')
    .set(bearer(token))
    .send({ eventId: String(eventId) });

const registeredCount = async (eventId) =>
  (await Event.findById(eventId)).registeredCount;

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
  await connectTestDb();

  await User.deleteMany({ email: TEST_EMAILS });

  organiser = await User.create({
    name: 'Reg Organiser',
    email: 'organiser@reg-test.eventhub',
    password: 'password123',
    role: 'organiser'
  });

  attendees = await User.create(
    [0, 1, 2, 3, 4].map((n) => ({
      name: `Reg Attendee ${n}`,
      email: `attendee${n}@reg-test.eventhub`,
      password: 'password123',
      role: 'attendee'
    }))
  );

  organiserToken = signToken(organiser);
  tokens = attendees.map((user) => signToken(user));

  // Make sure the unique indexes exist before testing duplicates
  await Event.init();
  await Registration.init();
}, 30000);

afterEach(async () => {
  await Registration.deleteMany({});
  await Event.deleteMany({});
});

afterAll(async () => {
  await Registration.deleteMany({});
  await User.deleteMany({ email: TEST_EMAILS });
  await mongoose.disconnect();
});

describe('POST /api/registrations', () => {
  it('returns 401 without a token', async () => {
    const event = await createEvent();
    const res = await request(app)
      .post('/api/registrations')
      .send({ eventId: String(event._id) });

    expect(res.statusCode).toBe(401);
  });

  it('returns 403 for an organiser', async () => {
    const event = await createEvent();
    const res = await register(event._id, organiserToken);

    expect(res.statusCode).toBe(403);
    expect(await registeredCount(event._id)).toBe(0);
  });

  it('registers an attendee and increases the registered count', async () => {
    const event = await createEvent();
    const res = await register(event._id, tokens[0]);

    expect(res.statusCode).toBe(201);
    expect(res.body.data.status).toBe('confirmed');
    expect(res.body.data.event.title).toBe('Registration Test Event');
    expect(res.body.data.event.registeredCount).toBe(1);
    expect(await registeredCount(event._id)).toBe(1);
  });

  it('returns 400 for an invalid event id', async () => {
    const res = await register('not-an-id', tokens[0]);
    expect(res.statusCode).toBe(400);
  });

  it('returns 404 when the event does not exist', async () => {
    const res = await register(new mongoose.Types.ObjectId(), tokens[0]);
    expect(res.statusCode).toBe(404);
  });

  it.each([['draft'], ['cancelled']])(
    'returns 409 for a %s event',
    async (status) => {
      const event = await createEvent({ status });
      const res = await register(event._id, tokens[0]);

      expect(res.statusCode).toBe(409);
      expect(await registeredCount(event._id)).toBe(0);
    }
  );

  it('returns 409 for an event that has already ended', async () => {
    const event = await createEvent({
      date: new Date(Date.now() - 3 * HOUR),
      endDate: new Date(Date.now() - 2 * HOUR)
    });
    const res = await register(event._id, tokens[0]);

    expect(res.statusCode).toBe(409);
  });

  it('returns 409 when the attendee is already registered', async () => {
    const event = await createEvent();
    await register(event._id, tokens[0]);
    const res = await register(event._id, tokens[0]);

    expect(res.statusCode).toBe(409);
    expect(await registeredCount(event._id)).toBe(1);
  });

  it('returns 409 when the event is fully booked', async () => {
    const event = await createEvent({ capacity: 1 });

    const first = await register(event._id, tokens[0]);
    const second = await register(event._id, tokens[1]);

    expect(first.statusCode).toBe(201);
    expect(second.statusCode).toBe(409);
    expect(second.body.message).toMatch(/fully booked/i);
    expect(await registeredCount(event._id)).toBe(1);
  });

  it('never overbooks when many attendees register at the same moment', async () => {
    const event = await createEvent({ capacity: 2 });

    const responses = await Promise.all(
      tokens.map((token) => register(event._id, token))
    );

    const statuses = responses.map((res) => res.statusCode).sort();

    expect(statuses).toEqual([201, 201, 409, 409, 409]);
    expect(await registeredCount(event._id)).toBe(2);
    expect(
      await Registration.countDocuments({
        event: event._id,
        status: 'confirmed'
      })
    ).toBe(2);
  });

  it('lets an attendee register again after cancelling, reusing the record', async () => {
    const event = await createEvent();

    const first = await register(event._id, tokens[0]);
    await request(app)
      .patch(`/api/registrations/${first.body.data._id}/cancel`)
      .set(bearer(tokens[0]));

    const again = await register(event._id, tokens[0]);

    expect(again.statusCode).toBe(201);
    expect(again.body.data._id).toBe(first.body.data._id);
    expect(again.body.data.status).toBe('confirmed');
    expect(await Registration.countDocuments({ event: event._id })).toBe(1);
    expect(await registeredCount(event._id)).toBe(1);
  });
});

describe('GET /api/registrations/mine', () => {
  it('returns only the logged-in attendee\'s registrations', async () => {
    const event = await createEvent();
    await register(event._id, tokens[0]);
    await register(event._id, tokens[1]);

    const res = await request(app)
      .get('/api/registrations/mine')
      .set(bearer(tokens[0]));

    expect(res.statusCode).toBe(200);
    expect(res.body.count).toBe(1);
    expect(res.body.data[0].event.title).toBe('Registration Test Event');
  });

  it('returns 403 for an organiser and 401 without a token', async () => {
    const asOrganiser = await request(app)
      .get('/api/registrations/mine')
      .set(bearer(organiserToken));
    const anonymous = await request(app).get('/api/registrations/mine');

    expect(asOrganiser.statusCode).toBe(403);
    expect(anonymous.statusCode).toBe(401);
  });
});

describe('GET /api/registrations/:id', () => {
  it('returns the registration to its owner', async () => {
    const event = await createEvent();
    const created = await register(event._id, tokens[0]);

    const res = await request(app)
      .get(`/api/registrations/${created.body.data._id}`)
      .set(bearer(tokens[0]));

    expect(res.statusCode).toBe(200);
    expect(res.body.data.event.location).toBe('Hall A');
  });

  it('returns 403 to a different attendee', async () => {
    const event = await createEvent();
    const created = await register(event._id, tokens[0]);

    const res = await request(app)
      .get(`/api/registrations/${created.body.data._id}`)
      .set(bearer(tokens[1]));

    expect(res.statusCode).toBe(403);
  });

  it('returns 404 for a missing registration and 400 for an invalid id', async () => {
    const missing = await request(app)
      .get(`/api/registrations/${new mongoose.Types.ObjectId()}`)
      .set(bearer(tokens[0]));
    const invalid = await request(app)
      .get('/api/registrations/not-an-id')
      .set(bearer(tokens[0]));

    expect(missing.statusCode).toBe(404);
    expect(invalid.statusCode).toBe(400);
  });
});

describe('PATCH /api/registrations/:id/cancel', () => {
  it('cancels the registration and releases the seat', async () => {
    const event = await createEvent();
    const created = await register(event._id, tokens[0]);

    const res = await request(app)
      .patch(`/api/registrations/${created.body.data._id}/cancel`)
      .set(bearer(tokens[0]));

    expect(res.statusCode).toBe(200);
    expect(res.body.data.status).toBe('cancelled');
    expect(res.body.data.cancelledAt).toBeDefined();
    expect(await registeredCount(event._id)).toBe(0);
  });

  it('returns 409 when cancelling twice and releases the seat only once', async () => {
    const event = await createEvent();
    await register(event._id, tokens[1]); // another attendee keeps a seat
    const created = await register(event._id, tokens[0]);
    const url = `/api/registrations/${created.body.data._id}/cancel`;

    await request(app).patch(url).set(bearer(tokens[0]));
    const second = await request(app).patch(url).set(bearer(tokens[0]));

    expect(second.statusCode).toBe(409);
    expect(await registeredCount(event._id)).toBe(1);
  });

  it('returns 403 when another attendee tries to cancel', async () => {
    const event = await createEvent();
    const created = await register(event._id, tokens[0]);

    const res = await request(app)
      .patch(`/api/registrations/${created.body.data._id}/cancel`)
      .set(bearer(tokens[1]));

    expect(res.statusCode).toBe(403);
    expect(await registeredCount(event._id)).toBe(1);
  });

  it('returns 409 once the event has started', async () => {
    // Already started but not finished, so registering is still allowed
    const event = await createEvent({
      date: new Date(Date.now() - HOUR),
      endDate: new Date(Date.now() + HOUR)
    });
    const created = await register(event._id, tokens[0]);

    const res = await request(app)
      .patch(`/api/registrations/${created.body.data._id}/cancel`)
      .set(bearer(tokens[0]));

    expect(res.statusCode).toBe(409);
    expect(await registeredCount(event._id)).toBe(1);
  });
});

describe('Event rules that depend on registrations', () => {
  it('rejects lowering capacity below the registered count', async () => {
    const event = await createEvent({ capacity: 5 });
    await register(event._id, tokens[0]);
    await register(event._id, tokens[1]);

    const tooLow = await request(app)
      .put(`/api/events/${event._id}`)
      .set(bearer(organiserToken))
      .send({ capacity: 1 });

    const allowed = await request(app)
      .put(`/api/events/${event._id}`)
      .set(bearer(organiserToken))
      .send({ capacity: 2 });

    expect(tooLow.statusCode).toBe(400);
    expect(tooLow.body.message).toMatch(/already registered/i);
    expect(allowed.statusCode).toBe(200);
  });

  it('deletes an event\'s registrations together with the event', async () => {
    const event = await createEvent();
    await register(event._id, tokens[0]);

    const res = await request(app)
      .delete(`/api/events/${event._id}`)
      .set(bearer(organiserToken));

    expect(res.statusCode).toBe(200);
    expect(await Registration.countDocuments({ event: event._id })).toBe(0);
  });
});