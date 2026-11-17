const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const Event = require('../src/models/event.model');
const User = require('../src/models/user.model');
const { signToken } = require('../src/utils/token');
const { connectTestDb } = require('./helpers/db');

const TEST_EMAILS = { $regex: '@event-test\\.eventhub$' };

const validEvent = {
  title: 'Docker Workshop',
  description: 'Introduction to containers',
  date: '2026-12-10T09:00:00+08:00',
  endDate: '2026-12-10T11:00:00+08:00',
  location: 'Hall A',
  capacity: 50,
  status: 'published'
};

let organiser;
let otherOrganiser;
let attendee;
let organiserToken;
let otherOrganiserToken;
let attendeeToken;

const bearer = (token) => ({ Authorization: `Bearer ${token}` });

// An event owned by the main test organiser
const createEvent = (overrides = {}) =>
  Event.create({ ...validEvent, createdBy: organiser._id, ...overrides });

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
  await connectTestDb();

  await User.deleteMany({ email: TEST_EMAILS });

  [organiser, otherOrganiser, attendee] = await User.create([
    {
      name: 'Organiser One',
      email: 'org1@event-test.eventhub',
      password: 'password123',
      role: 'organiser'
    },
    {
      name: 'Organiser Two',
      email: 'org2@event-test.eventhub',
      password: 'password123',
      role: 'organiser'
    },
    {
      name: 'Attendee One',
      email: 'att1@event-test.eventhub',
      password: 'password123',
      role: 'attendee'
    }
  ]);

  organiserToken = signToken(organiser);
  otherOrganiserToken = signToken(otherOrganiser);
  attendeeToken = signToken(attendee);
}, 30000);

afterEach(async () => {
  await Event.deleteMany({});
});

afterAll(async () => {
  await User.deleteMany({ email: TEST_EMAILS });
  await mongoose.disconnect();
});

describe('POST /api/events', () => {
  it('creates an event with valid data', async () => {
    const res = await request(app)
      .post('/api/events')
      .set(bearer(organiserToken))
      .send(validEvent);

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('Docker Workshop');
    expect(res.body.data.status).toBe('published');
  });

  it('sets createdBy to the logged-in organiser and ignores a spoofed value', async () => {
    const res = await request(app)
      .post('/api/events')
      .set(bearer(organiserToken))
      .send({ ...validEvent, createdBy: otherOrganiser._id });

    expect(res.statusCode).toBe(201);
    expect(String(res.body.data.createdBy)).toBe(String(organiser._id));
  });

  it('rejects an event without a location', async () => {
    const { location, ...invalid } = validEvent;

    const res = await request(app)
      .post('/api/events')
      .set(bearer(organiserToken))
      .send(invalid);

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('rejects capacity lower than 1', async () => {
    const res = await request(app)
      .post('/api/events')
      .set(bearer(organiserToken))
      .send({ ...validEvent, capacity: 0 });

    expect(res.statusCode).toBe(400);
  });

  it('rejects an event when end date is before start date', async () => {
    const res = await request(app)
      .post('/api/events')
      .set(bearer(organiserToken))
      .send({
        ...validEvent,
        title: 'Invalid Event',
        date: '2026-12-10T11:00:00+08:00',
        endDate: '2026-12-10T09:00:00+08:00'
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/End date must be later/i);
  });

  it('stores a valid image URL', async () => {
    const res = await request(app)
      .post('/api/events')
      .set(bearer(organiserToken))
      .send({ ...validEvent, imageUrl: 'https://example.com/poster.jpg' });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.imageUrl).toBe('https://example.com/poster.jpg');
  });

  it('rejects an image URL that is not http(s)', async () => {
    const res = await request(app)
      .post('/api/events')
      .set(bearer(organiserToken))
      .send({ ...validEvent, imageUrl: 'javascript:alert(1)' });

    expect(res.statusCode).toBe(400);
  });

  it('accepts a path on this site as the image', async () => {
    const res = await request(app)
      .post('/api/events')
      .set(bearer(organiserToken))
      .send({ ...validEvent, imageUrl: '/posters/futsal-cup.jpg' });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.imageUrl).toBe('/posters/futsal-cup.jpg');
  });

  it('rejects a protocol-relative image URL', async () => {
    const res = await request(app)
      .post('/api/events')
      .set(bearer(organiserToken))
      .send({ ...validEvent, imageUrl: '//evil.example/x.jpg' });

    expect(res.statusCode).toBe(400);
  });
});

describe('GET /api/events', () => {
  it('returns only published events that have not ended (public, no login)', async () => {
    const now = Date.now();

    const futureStart = new Date(now + 60 * 60 * 1000);
    const futureEnd = new Date(now + 2 * 60 * 60 * 1000);
    const pastStart = new Date(now - 3 * 60 * 60 * 1000);
    const pastEnd = new Date(now - 2 * 60 * 60 * 1000);

    await createEvent({
      title: 'Upcoming Workshop',
      date: futureStart,
      endDate: futureEnd,
      status: 'published'
    });
    await createEvent({
      title: 'Draft Workshop',
      date: futureStart,
      endDate: futureEnd,
      status: 'draft'
    });
    await createEvent({
      title: 'Cancelled Workshop',
      date: futureStart,
      endDate: futureEnd,
      status: 'cancelled'
    });
    await createEvent({
      title: 'Past Workshop',
      date: pastStart,
      endDate: pastEnd,
      status: 'published'
    });

    const res = await request(app).get('/api/events');

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBe(1);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].title).toBe('Upcoming Workshop');
  });
});

describe('GET /api/events/mine', () => {
  it('returns only the organiser\'s own events, including drafts', async () => {
    const future = {
      date: new Date(Date.now() + 60 * 60 * 1000),
      endDate: new Date(Date.now() + 2 * 60 * 60 * 1000)
    };

    await createEvent({ ...future, title: 'My Published', status: 'published' });
    await createEvent({ ...future, title: 'My Draft', status: 'draft' });
    await createEvent({
      ...future,
      title: 'Someone Else',
      createdBy: otherOrganiser._id
    });

    const res = await request(app)
      .get('/api/events/mine')
      .set(bearer(organiserToken));

    expect(res.statusCode).toBe(200);
    expect(res.body.count).toBe(2);

    const titles = res.body.data.map((event) => event.title).sort();
    expect(titles).toEqual(['My Draft', 'My Published']);
  });

  it('returns 403 for an attendee', async () => {
    const res = await request(app)
      .get('/api/events/mine')
      .set(bearer(attendeeToken));

    expect(res.statusCode).toBe(403);
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/events/mine');
    expect(res.statusCode).toBe(401);
  });
});

describe('GET /api/events/:id', () => {
  it('returns one event', async () => {
    const event = await createEvent();

    const res = await request(app).get(`/api/events/${event._id}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.title).toBe('Docker Workshop');
  });

  it('returns 404 when the event does not exist', async () => {
    const missingId = new mongoose.Types.ObjectId();

    const res = await request(app).get(`/api/events/${missingId}`);

    expect(res.statusCode).toBe(404);
  });

  it('returns 400 for an invalid id', async () => {
    const res = await request(app).get('/api/events/not-a-valid-id');

    expect(res.statusCode).toBe(400);
  });
});

describe('PUT /api/events/:id', () => {
  it('updates an event and saves the change', async () => {
    const event = await createEvent();

    const res = await request(app)
      .put(`/api/events/${event._id}`)
      .set(bearer(organiserToken))
      .send({ capacity: 80, location: 'Hall B' });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.capacity).toBe(80);
    expect(res.body.data.location).toBe('Hall B');

    const saved = await Event.findById(event._id);

    expect(saved.capacity).toBe(80);
    expect(saved.location).toBe('Hall B');
  });

  it('rejects an invalid update', async () => {
    const event = await createEvent();

    const res = await request(app)
      .put(`/api/events/${event._id}`)
      .set(bearer(organiserToken))
      .send({ capacity: 0 });

    expect(res.statusCode).toBe(400);
  });

  it('returns 404 when the event does not exist', async () => {
    const missingId = new mongoose.Types.ObjectId();

    const res = await request(app)
      .put(`/api/events/${missingId}`)
      .set(bearer(organiserToken))
      .send({ capacity: 10 });

    expect(res.statusCode).toBe(404);
  });
});

describe('DELETE /api/events/:id', () => {
  it('deletes an event', async () => {
    const event = await createEvent();

    const res = await request(app)
      .delete(`/api/events/${event._id}`)
      .set(bearer(organiserToken));

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);

    const deleted = await Event.findById(event._id);

    expect(deleted).toBeNull();
  });

  it('returns 404 when the event does not exist', async () => {
    const missingId = new mongoose.Types.ObjectId();

    const res = await request(app)
      .delete(`/api/events/${missingId}`)
      .set(bearer(organiserToken));

    expect(res.statusCode).toBe(404);
  });
});

describe('Role-based access control', () => {
  it('returns 401 when creating an event without a token', async () => {
    const res = await request(app).post('/api/events').send(validEvent);
    expect(res.statusCode).toBe(401);
  });

  it('returns 403 when an attendee creates an event', async () => {
    const res = await request(app)
      .post('/api/events')
      .set(bearer(attendeeToken))
      .send(validEvent);

    expect(res.statusCode).toBe(403);
    expect(await Event.countDocuments()).toBe(0);
  });

  it('returns 403 when an attendee updates an event', async () => {
    const event = await createEvent();

    const res = await request(app)
      .put(`/api/events/${event._id}`)
      .set(bearer(attendeeToken))
      .send({ capacity: 99 });

    expect(res.statusCode).toBe(403);
  });

  it('returns 401 when deleting without a token', async () => {
    const event = await createEvent();

    const res = await request(app).delete(`/api/events/${event._id}`);

    expect(res.statusCode).toBe(401);
  });

  it('returns 403 when an attendee deletes an event', async () => {
    const event = await createEvent();

    const res = await request(app)
      .delete(`/api/events/${event._id}`)
      .set(bearer(attendeeToken));

    expect(res.statusCode).toBe(403);
    expect(await Event.findById(event._id)).not.toBeNull();
  });
});

describe('Event ownership', () => {
  it('returns 403 when another organiser updates the event', async () => {
    const event = await createEvent();

    const res = await request(app)
      .put(`/api/events/${event._id}`)
      .set(bearer(otherOrganiserToken))
      .send({ capacity: 99 });

    expect(res.statusCode).toBe(403);

    const saved = await Event.findById(event._id);
    expect(saved.capacity).toBe(50); // unchanged
  });

  it('returns 403 when another organiser deletes the event', async () => {
    const event = await createEvent();

    const res = await request(app)
      .delete(`/api/events/${event._id}`)
      .set(bearer(otherOrganiserToken));

    expect(res.statusCode).toBe(403);
    expect(await Event.findById(event._id)).not.toBeNull();
  });
});