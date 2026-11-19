import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';

import { EventItem } from '../../models/event.model';
import { EventPayload } from '../../services/event-api';
import { fromLocalInputValue, toLocalInputValue } from '../../utils/datetime';
import { EventForm } from './event-form';

const DAY = 24 * 60 * 60 * 1000;

// A local date-time for the datetime-local input, N days from now at the given hour
function inDays(days: number, hour = 10): string {
  const date = new Date(Date.now() + days * DAY);
  date.setHours(hour, 0, 0, 0);
  return toLocalInputValue(date);
}

async function setup(options: { mode?: 'create' | 'edit'; event?: EventItem } = {}) {
  await TestBed.configureTestingModule({
    imports: [EventForm],
    providers: [provideRouter([])]
  }).compileComponents();

  const fixture = TestBed.createComponent(EventForm);
  fixture.componentRef.setInput('mode', options.mode ?? 'create');

  if (options.event) {
    fixture.componentRef.setInput('event', options.event);
  }

  fixture.detectChanges();

  const saved: EventPayload[] = [];
  fixture.componentInstance.save.subscribe((payload) => saved.push(payload));

  return { component: fixture.componentInstance, form: fixture.componentInstance.form, saved };
}

const existingEvent = (overrides: Record<string, unknown> = {}) =>
  ({
    _id: 'event-1',
    title: 'Existing event',
    description: '',
    date: new Date(Date.now() + 5 * DAY).toISOString(),
    endDate: new Date(Date.now() + 5 * DAY + 2 * 60 * 60 * 1000).toISOString(),
    location: 'Hall A',
    capacity: 30,
    registeredCount: 10,
    status: 'published',
    ...overrides
  }) as unknown as EventItem;

describe('EventForm', () => {
  it('does not save while required fields are empty', async () => {
    const { component, form, saved } = await setup();

    component.onSubmit();

    expect(saved).toHaveLength(0);
    expect(component.attempted()).toBe(true);
    expect(form.controls.title.errors).toEqual({ required: true });
  });

  it('fills the end time two hours after the start when it is empty', async () => {
    const { form } = await setup();

    form.controls.date.setValue(inDays(3, 10));

    expect(form.controls.endDate.value).toBe(inDays(3, 12));
  });

  it('rejects an end time that is not after the start time', async () => {
    const { component, form } = await setup();

    form.patchValue({ date: inDays(3, 10), endDate: inDays(3, 9) });

    expect(form.controls.endDate.errors).toEqual({ endBeforeStart: true });
    expect(component.errorMessage('endDate')).toBe('The end time must be after the start time.');
  });

  it('rejects a new event that starts in the past', async () => {
    const { form } = await setup();

    form.controls.date.setValue(inDays(-1));

    expect(form.controls.date.errors).toEqual({ startInPast: true });
  });

  it('saves a trimmed payload with UTC dates', async () => {
    const { component, form, saved } = await setup();
    const start = inDays(3, 10);
    const end = inDays(3, 12);

    form.patchValue({
      title: '  Docker Workshop  ',
      location: ' Hall B ',
      date: start,
      endDate: end,
      capacity: 50
    });
    component.onSubmit();

    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({
      title: 'Docker Workshop',
      location: 'Hall B',
      capacity: 50,
      status: 'published'
    });
    expect(saved[0].date).toBe(fromLocalInputValue(start));
    expect(saved[0].endDate).toBe(fromLocalInputValue(end));
  });

  it('refuses a capacity below the number of people already registered', async () => {
    const { form } = await setup({ mode: 'edit', event: existingEvent() });

    form.controls.capacity.setValue(5);
    expect(form.controls.capacity.errors).toEqual({ belowRegistered: true });

    form.controls.capacity.setValue(10);
    expect(form.controls.capacity.errors).toBeNull();
  });

  it('keeps an unchanged start time valid when editing an event that already started', async () => {
    const started = existingEvent({
      date: new Date(Date.now() - DAY).toISOString(),
      endDate: new Date(Date.now() + DAY).toISOString()
    });

    const { form } = await setup({ mode: 'edit', event: started });

    expect(form.controls.date.errors).toBeNull();
  });
});