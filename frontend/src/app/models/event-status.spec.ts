import { describe, expect, it } from 'vitest';

import { EventItem } from './event.model';
import { getEventDisplayStatus } from './event-status';

const NOW = new Date('2026-12-01T12:00:00Z').getTime();

const event = (overrides: Record<string, unknown>) =>
  ({
    _id: 'event-1',
    title: 'Test',
    description: '',
    date: '2026-12-10T09:00:00Z',
    endDate: '2026-12-10T11:00:00Z',
    location: 'Hall A',
    capacity: 10,
    registeredCount: 0,
    status: 'published',
    ...overrides
  }) as unknown as EventItem;

describe('getEventDisplayStatus', () => {
  it('is published while the event is still to come', () => {
    expect(getEventDisplayStatus(event({}), NOW)).toBe('published');
  });

  it('is ended after the end time', () => {
    const past = event({ date: '2026-11-01T09:00:00Z', endDate: '2026-11-01T11:00:00Z' });

    expect(getEventDisplayStatus(past, NOW)).toBe('ended');
  });

  it('keeps draft and cancelled as they are', () => {
    expect(getEventDisplayStatus(event({ status: 'draft' }), NOW)).toBe('draft');
    expect(getEventDisplayStatus(event({ status: 'cancelled' }), NOW)).toBe('cancelled');
  });
});