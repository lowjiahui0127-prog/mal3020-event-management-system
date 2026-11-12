import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faCalendarDays,
  faLocationDot,
  faPlus,
  faRotateRight
} from '@fortawesome/free-solid-svg-icons';

import { EventApi, EventPayload } from '../../services/event-api';
import { EventItem } from '../../models/event.model';
import {
  EVENT_STATUS_LABELS,
  EventDisplayStatus,
  getEventDisplayStatus
} from '../../models/event-status';
import { getErrorMessage } from '../../utils/http-error';

type Filter = 'all' | EventDisplayStatus;

interface PendingAction {
  id: string;
  action: 'cancel' | 'delete';
}

@Component({
  selector: 'app-event-management',
  imports: [DatePipe, RouterLink, FontAwesomeModule],
  templateUrl: './event-management.html',
  styleUrl: './event-management.css'
})
export class EventManagement implements OnInit {
  private readonly eventApi = inject(EventApi);

  readonly faCalendarDays = faCalendarDays;
  readonly faLocationDot = faLocationDot;
  readonly faPlus = faPlus;
  readonly faRotateRight = faRotateRight;

  readonly filters: { id: Filter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'published', label: 'Published' },
    { id: 'draft', label: 'Drafts' },
    { id: 'ended', label: 'Ended' },
    { id: 'cancelled', label: 'Cancelled' }
  ];
  readonly skeletonItems = [1, 2, 3];

  readonly events = signal<EventItem[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');
  readonly actionError = signal('');
  readonly activeFilter = signal<Filter>('all');
  readonly searchTerm = signal('');
  readonly notice = signal('');

  // The event waiting for a second confirmation, and the one being saved
  readonly pending = signal<PendingAction | null>(null);
  readonly busyId = signal<string | null>(null);

  readonly counts = computed(() => {
    const now = Date.now();
    const counts: Record<Filter, number> = {
      all: 0,
      published: 0,
      draft: 0,
      ended: 0,
      cancelled: 0
    };

    for (const event of this.events()) {
      counts.all++;
      counts[getEventDisplayStatus(event, now)]++;
    }

    return counts;
  });

  readonly visible = computed(() => {
    const filter = this.activeFilter();
    const term = this.searchTerm().trim().toLowerCase();
    const now = Date.now();

    const list = this.events().filter(
      (event) =>
        (filter === 'all' || getEventDisplayStatus(event, now) === filter) &&
        (!term ||
          event.title.toLowerCase().includes(term) ||
          event.location.toLowerCase().includes(term))
    );

    // Upcoming work first (soonest at the top); everything else newest first
    const ascending = filter === 'published' || filter === 'draft';

    return [...list].sort(
      (a, b) =>
        (ascending ? 1 : -1) *
        (new Date(a.date).getTime() - new Date(b.date).getTime())
    );
  });

  ngOnInit(): void {
    this.readNotice();
    this.load();
  }

  // Create/Edit pages pass a one-time success message through the router state
  private readNotice(): void {
    const notice = history.state?.['notice'];

    if (typeof notice === 'string' && notice) {
      this.notice.set(notice);
      history.replaceState({ ...history.state, notice: undefined }, '');
    }
  }

  load(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.eventApi.getMyEvents().subscribe({
      next: (response) => {
        this.events.set(response.data ?? []);
        this.isLoading.set(false);
      },
      error: (error: unknown) => {
        this.errorMessage.set(
          getErrorMessage(error, 'Unable to load your events. Please try again.')
        );
        this.isLoading.set(false);
      }
    });
  }

  statusOf(event: EventItem): EventDisplayStatus {
    return getEventDisplayStatus(event);
  }

  statusLabel(event: EventItem): string {
    return EVENT_STATUS_LABELS[getEventDisplayStatus(event)];
  }

  percent(event: EventItem): number {
    if (!event.capacity) return 0;
    return Math.min(100, Math.round((event.registeredCount / event.capacity) * 100));
  }

  isPending(event: EventItem): boolean {
    return this.pending()?.id === event._id;
  }

  confirmText(event: EventItem): string {
    const count = event.registeredCount;

    if (this.pending()?.action === 'cancel') {
      return count > 0
        ? `Cancel this event? ${count} registered ${count === 1 ? 'attendee' : 'attendees'} will see it as cancelled.`
        : 'Cancel this event?';
    }

    return count > 0
      ? `Delete this event permanently? This also removes ${count === 1 ? '1 registration' : count + ' registrations'}.`
      : 'Delete this event permanently?';
  }

  ask(event: EventItem, action: 'cancel' | 'delete'): void {
    this.actionError.set('');
    this.pending.set({ id: event._id, action });
  }

  keep(): void {
    this.pending.set(null);
  }

  publish(event: EventItem): void {
    this.runUpdate(event, { status: 'published' });
  }

  confirm(event: EventItem): void {
    const pending = this.pending();

    if (!pending || pending.id !== event._id) {
      return;
    }

    if (pending.action === 'cancel') {
      this.runUpdate(event, { status: 'cancelled' });
    } else {
      this.runDelete(event);
    }
  }

  private runUpdate(event: EventItem, changes: Partial<EventPayload>): void {
    if (this.busyId()) return;

    this.busyId.set(event._id);
    this.actionError.set('');

    this.eventApi.updateEvent(event._id, changes).subscribe({
      next: (response) => {
        this.events.update((list) =>
          list.map((item) => (item._id === event._id ? response.data : item))
        );
        this.pending.set(null);
        this.busyId.set(null);
      },
      error: (error: unknown) => {
        this.actionError.set(
          getErrorMessage(error, 'Could not update the event. Please try again.')
        );
        this.pending.set(null);
        this.busyId.set(null);
      }
    });
  }

  private runDelete(event: EventItem): void {
    if (this.busyId()) return;

    this.busyId.set(event._id);
    this.actionError.set('');

    this.eventApi.deleteEvent(event._id).subscribe({
      next: () => {
        this.events.update((list) => list.filter((item) => item._id !== event._id));
        this.pending.set(null);
        this.busyId.set(null);
      },
      error: (error: unknown) => {
        this.actionError.set(
          getErrorMessage(error, 'Could not delete the event. Please try again.')
        );
        this.pending.set(null);
        this.busyId.set(null);
      }
    });
  }
}