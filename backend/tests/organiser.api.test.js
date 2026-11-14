const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const Event = require('../src/models/event.model');
const User = require('../src/models/user.model');
const Registration = require('../src/models/registration.model');
const { signToken } = require('../src/utils/token');
const { connectTestDb } = require('./helpers/db');

const TEST_EMAILS = { $regex: '@org-test\\.eventhub$' };
const HOUR = 60 * 60 * 1000;

let organiser;
let otherOrganiser;
let attendees;
let organiserToken;
let otherOrganiserToken;
let attendeeToken;

const bearer = (token) => ({ Authorization: `Bearer ${token}` });

const createEvent = (overrides = {}) =>
  Event.create({
    title: 'Organiser Test Event',
    description: 'Used by organiser tests',
    date: new Date(Date.now() + 24 * HOUR),
    endDate: new Date(Date.now() + 26 * HOUR),
    location: 'Hall A',
    capacity: 10,
    status: 'published',
    createdBy: organiser._id,
    ...overrides
  });

const hoursAgo = (hours) => new Date(Date.now() - hours * HOUR);

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
  await connectTestDb();

  await User.deleteMany({ email: TEST_EMAILS });

  [organiser, otherOrganiser] = await User.create([
    {
      name: 'Org One',
      email: 'org1@org-test.eventhub',
      password: 'password123',
      role: 'organiser'
    },
    {
      name: 'Org Two',
      email: 'org2@org-test.eventhub',
      password: 'password123',
      role: 'organiser'
    }
  ]);

  attendees = await User.create(
    [0, 1, 2].map((n) => ({
      name: `Org Attendee ${n}`,
      email: `attendee${n}@org-test.eventhub`,
      password: 'password123',
      role: 'attendee'
    }))
  );

  organiserToken = signToken(organiser);
  otherOrganiserToken = signToken(otherOrganiser);
  attendeeToken = signToken(attendees[0]);

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

describe('GET /api/events/:id/registrations', () => {
  it('returns 401 without a token', async () => {
    const event = await createEvent();
    const res = await request(app).get(`/api/events/${event._id}/registrations`);
    expect(res.statusCode).toBe(401);
  });

  it('returns 403 for an attendee', async () => {
    const event = await createEvent();
    const res = await request(app)
      .get(`/api/events/${event._id}/registrations`)
      .set(bearer(attendeeToken));
    expect(res.statusCode).toBe(403);
  });

  it('returns 403 for an organiser who does not own the event', async () => {
    const event = await createEvent();
    const res = await request(app)
      .get(`/api/events/${event._id}/registrations`)
      .set(bearer(otherOrganiserToken));
    expect(res.statusCode).toBe(403);
  });

  it('returns 400 for an invalid id and 404 for a missing event', async () => {
    const invalid = await request(app)
      .get('/api/events/not-an-id/registrations')
      .set(bearer(organiserToken));
    const missing = await request(app)
      .get(`/api/events/${new mongoose.Types.ObjectId()}/registrations`)
      .set(bearer(organiserToken));

    expect(invalid.statusCode).toBe(400);
    expect(missing.statusCode).toBe(404);
  });

  it('lists attendees (newest first, including cancelled) for the owner', async () => {
    const event = await createEvent();

    await Registration.create([
      { user: attendees[0]._id, event: event._id, registeredAt: hoursAgo(2) },
      { user: attendees[1]._id, event: event._id, registeredAt: hoursAgo(1) },
      {
        user: attendees[2]._id,
        event: event._id,
        status: 'cancelled',
        registeredAt: hoursAgo(3),
        cancelledAt: hoursAgo(2)
      }
    ]);

    const res = await request(app)
      .get(`/api/events/${event._id}/registrations`)
      .set(bearer(organiserToken));

    expect(res.statusCode).toBe(200);
    expect(res.body.event.title).toBe('Organiser Test Event');
    expect(res.body.count).toBe(3);
    expect(res.body.data.map((r) => r.user.name)).toEqual([
      'Org Attendee 1',
      'Org Attendee 0',
      'Org Attendee 2'
    ]);
    expect(res.body.data[0].user.email).toBe('attendee1@org-test.eventhub');
    expect(res.body.data[2].status).toBe('cancelled');
  });
});

describe('GET /api/events/mine/recent-registrations', () => {
  it('returns 401 without a token and 403 for an attendee', async () => {
    const anonymous = await request(app).get(
      '/api/events/mine/recent-registrations'
    );
    const asAttendee = await request(app)
      .get('/api/events/mine/recent-registrations')
      .set(bearer(attendeeToken));

    expect(anonymous.statusCode).toBe(401);
    expect(asAttendee.statusCode).toBe(403);
  });

  it('returns confirmed registrations for my events only, newest first, without emails', async () => {
    const mine = await createEvent();
    const notMine = await createEvent({
      title: 'Someone Else',
      createdBy: otherOrganiser._id
    });

    await Registration.create([
      { user: attendees[0]._id, event: mine._id, registeredAt: hoursAgo(2) },
      { user: attendees[1]._id, event: mine._id, registeredAt: hoursAgo(1) },
      {
        user: attendees[2]._id,
        event: mine._id,
        status: 'cancelled',
        registeredAt: hoursAgo(1),
        cancelledAt: hoursAgo(1)
      },
      { user: attendees[0]._id, event: notMine._id, registeredAt: hoursAgo(1) }
    ]);

    const res = await request(app)
      .get('/api/events/mine/recent-registrations')
      .set(bearer(organiserToken));

    expect(res.statusCode).toBe(200);
    expect(res.body.count).toBe(2);
    expect(res.body.data.map((r) => r.user.name)).toEqual([
      'Org Attendee 1',
      'Org Attendee 0'
    ]);
    expect(res.body.data[0].event.title).toBe('Organiser Test Event');
    expect(res.body.data[0].user.email).toBeUndefined();
  });

  it('respects the limit query', async () => {
    const mine = await createEvent();

    await Registration.create([
      { user: attendees[0]._id, event: mine._id, registeredAt: hoursAgo(2) },
      { user: attendees[1]._id, event: mine._id, registeredAt: hoursAgo(1) }
    ]);

    const res = await request(app)
      .get('/api/events/mine/recent-registrations?limit=1')
      .set(bearer(organiserToken));

    expect(res.body.count).toBe(1);
    expect(res.body.data[0].user.name).toBe('Org Attendee 1');
  });
});