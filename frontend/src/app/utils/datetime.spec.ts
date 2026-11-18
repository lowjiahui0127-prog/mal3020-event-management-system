import { describe, expect, it } from 'vitest';

import { fromLocalInputValue, toLocalInputValue } from './datetime';

describe('datetime helpers', () => {
  it('round-trips a local date-time without shifting the time', () => {
    const iso = fromLocalInputValue('2026-12-10T17:00');

    expect(iso).not.toBeNull();
    expect(toLocalInputValue(iso as string)).toBe('2026-12-10T17:00');
  });

  it('returns null for empty or invalid input', () => {
    expect(fromLocalInputValue('')).toBeNull();
    expect(fromLocalInputValue('not a date')).toBeNull();
  });

  it('returns an empty string for an invalid date', () => {
    expect(toLocalInputValue('nope')).toBe('');
  });
});