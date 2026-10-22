require('dotenv').config();

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const Event = require('../src/models/event.model');

const validEvent = {
  title: 'Docker Workshop',
  description: 'Introduction to containers',
  date: '2026-12-10T09:00:00+08:00',
  endDate: '2026-12-10T11:00:00+08:00',
  location: 'Hall A',
  capacity: 50,
  status: 'published'
};

beforeAll(async () => {
  const uri = process.env.MONGO_URI_TEST;

  if (!uri) {
    throw new Error('MONGO_URI_TEST is not configured');
  }

  const databaseName = new URL(uri).pathname.slice(1);

  if (databaseName !== 'eventdb_test') {
    throw new Error(
      'Integration tests must use the eventdb_test database'
    );
  }

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
    // Jest cannot run the driver's dynamic import('os'), so provide it directly
    runtimeAdapters: { os: require('os') }
  });
}, 30000);

afterEach(async () => {
  await Event.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
});

describe('POST /api/events', () => {
  it('creates an event with valid data', async () => {
    const res = await request(app)
      .post('/api/events')
      .send(validEvent);

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('Docker Workshop');
    expect(res.body.data.status).toBe('published');
  });

  it('rejects an event without a location', async () => {
    const { location, ...invalid } = validEvent;

    const res = await request(app)
      .post('/api/events')
      .send(invalid);

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('rejects capacity lower than 1', async () => {
    const res = await request(app)
      .post('/api/events')
      .send({ ...validEvent, capacity: 0 });

    expect(res.statusCode).toBe(400);
  });
});

it('should reject an event when end date is before start date', async () => {
    const response = await request(app)
      .post('/api/events')
      .send({
        title: 'Invalid Event',
        description: 'Invalid time range',
        date: '2026-12-10T11:00:00+08:00',
        endDate: '2026-12-10T09:00:00+08:00',
        location: 'Hall A',
        capacity: 30,
        status: 'published'
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toMatch(/End date must be later/i);
  });


describe('GET /api/events', () => {
  it('returns only published events that have not ended', async () => {
    const now = Date.now();

    const futureStart = new Date(now + 60 * 60 * 1000);
    const futureEnd = new Date(now + 2 * 60 * 60 * 1000);

    const pastStart = new Date(now - 3 * 60 * 60 * 1000);
    const pastEnd = new Date(now - 2 * 60 * 60 * 1000);

    // Published and not ended: should be returned
    await Event.create({
      ...validEvent,
      title: 'Upcoming Workshop',
      date: futureStart,
      endDate: futureEnd,
      status: 'published'
    });

    // Draft: should not be returned
    await Event.create({
      ...validEvent,
      title: 'Draft Workshop',
      date: futureStart,
      endDate: futureEnd,
      status: 'draft'
    });

    // Cancelled: should not be returned
    await Event.create({
      ...validEvent,
      title: 'Cancelled Workshop',
      date: futureStart,
      endDate: futureEnd,
      status: 'cancelled'
    });

    // Already ended: should not be returned
    await Event.create({
      ...validEvent,
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


describe('GET /api/events/:id', () => {
  it('returns one event', async () => {
    const event = await Event.create(validEvent);

    const res = await request(app)
      .get(`/api/events/${event._id}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.title).toBe('Docker Workshop');
  });

  it('returns 404 when the event does not exist', async () => {
    const missingId = new mongoose.Types.ObjectId();

    const res = await request(app)
      .get(`/api/events/${missingId}`);

    expect(res.statusCode).toBe(404);
  });

  it('returns 400 for an invalid id', async () => {
    const res = await request(app)
      .get('/api/events/not-a-valid-id');

    expect(res.statusCode).toBe(400);
  });
});

describe('PUT /api/events/:id', () => {
  it('updates an event and saves the change', async () => {
    const event = await Event.create(validEvent);

    const res = await request(app)
      .put(`/api/events/${event._id}`)
      .send({ capacity: 80, location: 'Hall B' });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.capacity).toBe(80);
    expect(res.body.data.location).toBe('Hall B');

    const saved = await Event.findById(event._id);

    expect(saved.capacity).toBe(80);
    expect(saved.location).toBe('Hall B');
  });

  it('rejects an invalid update', async () => {
    const event = await Event.create(validEvent);

    const res = await request(app)
      .put(`/api/events/${event._id}`)
      .send({ capacity: 0 });

    expect(res.statusCode).toBe(400);
  });

  it('returns 404 when the event does not exist', async () => {
    const missingId = new mongoose.Types.ObjectId();

    const res = await request(app)
      .put(`/api/events/${missingId}`)
      .send({ capacity: 10 });

    expect(res.statusCode).toBe(404);
  });
});

describe('DELETE /api/events/:id', () => {
  it('deletes an event', async () => {
    const event = await Event.create(validEvent);

    const res = await request(app)
      .delete(`/api/events/${event._id}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);

    const deleted = await Event.findById(event._id);

    expect(deleted).toBeNull();
  });

  it('returns 404 when the event does not exist', async () => {
    const missingId = new mongoose.Types.ObjectId();

    const res = await request(app)
      .delete(`/api/events/${missingId}`);

    expect(res.statusCode).toBe(404);
  });
});
