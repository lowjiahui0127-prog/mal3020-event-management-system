import { describe, expect, it } from 'vitest';

import {
  RegistrationItem,
  getDisplayStatus,
  getReference
} from './registration.model';

const NOW = new Date('2026-12-01T12:00:00Z').getTime();

function make(
  overrides: Partial<RegistrationItem> = {},
  eventOverrides: Partial<RegistrationItem['event']> = {}
): RegistrationItem {
  return {
    _id: '6ae71d76f3f1f666776922ae',
    user: 'user-1',
    status: 'confirmed',
    registeredAt: '2026-11-01T00:00:00Z',
    createdAt: '2026-11-01T00:00:00Z',
    updatedAt: '2026-11-01T00:00:00Z',
    event: {
      _id: 'event-1',
      title: 'Test event',
      date: '2026-12-10T09:00:00Z',
      endDate: '2026-12-10T11:00:00Z',
      location: 'Hall A',
      status: 'published',
      capacity: 10,
      registeredCount: 1,
      ...eventOverrides
    },
    ...overrides
  };
}

describe('getDisplayStatus', () => {
  it('is confirmed for an upcoming event', () => {
    expect(getDisplayStatus(make(), NOW)).toBe('confirmed');
  });

  it('is cancelled when the attendee cancelled', () => {
    expect(getDisplayStatus(make({ status: 'cancelled' }), NOW)).toBe('cancelled');
  });

  it('shows that the organiser cancelled the event', () => {
    expect(getDisplayStatus(make({}, { status: 'cancelled' }), NOW)).toBe('event-cancelled');
  });

  it('is completed once the event has ended', () => {
    const ended = make({}, { date: '2026-11-20T09:00:00Z', endDate: '2026-11-20T11:00:00Z' });

    expect(getDisplayStatus(ended, NOW)).toBe('completed');
  });
});

describe('getReference', () => {
  it('builds a short uppercase reference from the id', () => {
    expect(getReference(make())).toBe('REG-6922AE');
  });
});