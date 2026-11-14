import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';

import { EventApi } from '../../services/event-api';
import { EventItem } from '../../models/event.model';
import {
  EVENT_STATUS_LABELS,
  getEventDisplayStatus
} from '../../models/event-status';
import { AttendeeRegistration } from '../../models/registration.model';
import { getErrorMessage } from '../../utils/http-error';
import { RealtimeService } from '../../services/realtime.service';
import { RealtimeMessage } from '../../models/realtime.model';
import { LiveIndicator } from '../../components/live-indicator/live-indicator';

type Filter = 'all' | 'confirmed' | 'cancelled';

@Component({
  selector: 'app-event-registrations',
  imports: [DatePipe, RouterLink, FontAwesomeModule, LiveIndicator],
  templateUrl: './event-registrations.html',
  styleUrl: './event-registrations.css'
})
export class EventRegistrations implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly eventApi = inject(EventApi);
  private readonly realtime = inject(RealtimeService);
  private readonly destroyRef = inject(DestroyRef);

  readonly flashing = signal<ReadonlySet<string>>(new Set<string>());

  readonly faArrowLeft = faArrowLeft;

  readonly filters: { id: Filter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'confirmed', label: 'Confirmed' },
    { id: 'cancelled', label: 'Cancelled' }
  ];

  readonly event = signal<EventItem | null>(null);
  readonly registrations = signal<AttendeeRegistration[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');

  readonly activeFilter = signal<Filter>('all');
  readonly searchTerm = signal('');

  readonly counts = computed(() => {
    const list = this.registrations();

    return {
      all: list.length,
      confirmed: list.filter((item) => item.status === 'confirmed').length,
      cancelled: list.filter((item) => item.status === 'cancelled').length
    };
  });

  readonly spotsLeft = computed(() => {
    const item = this.event();
    return item ? Math.max(item.capacity - item.registeredCount, 0) : 0;
  });

  readonly fillPercent = computed(() => {
    const item = this.event();
    if (!item || !item.capacity) return 0;
    return Math.min(100, Math.round((item.registeredCount / item.capacity) * 100));
  });

  readonly eventStatus = computed(() => {
    const item = this.event();
    return item ? getEventDisplayStatus(item) : 'draft';
  });

  readonly eventStatusLabel = computed(() => EVENT_STATUS_LABELS[this.eventStatus()]);

  readonly visible = computed(() => {
    const filter = this.activeFilter();
    const term = this.searchTerm().trim().toLowerCase();

    return this.registrations().filter((item) => {
      const matchesFilter = filter === 'all' || item.status === filter;
      const matchesSearch =
        !term ||
        item.user.name.toLowerCase().includes(term) ||
        item.user.email.toLowerCase().includes(term);

      return matchesFilter && matchesSearch;
    });
  });

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');

      if (!id) {
        this.errorMessage.set('No event ID was provided.');
        this.isLoading.set(false);
        return;
      }

      this.load(id);
    });

    this.realtime.messages$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((message) => this.onMessage(message));

    this.realtime.reconnected$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const id = this.event()?._id;
        if (id) this.load(id, true);
      });
  }

  load(id: string, silent = false): void {
    if (!silent) {
      this.isLoading.set(true);
    }
    this.errorMessage.set('');

    this.eventApi.getEventRegistrations(id).subscribe({
      next: (response) => {
        this.event.set(response.event);
        this.registrations.set(response.data ?? []);
        this.isLoading.set(false);
      },
      error: (error: unknown) => {
        this.errorMessage.set(
          getErrorMessage(error, 'We could not load the registrations.')
        );
        this.isLoading.set(false);
      }
    });
  }

  statusLabel(item: AttendeeRegistration): string {
    return item.status === 'confirmed' ? 'Confirmed' : 'Cancelled';
  }

  private onMessage(message: RealtimeMessage): void {
    const current = this.event();

    if (!current) return;

    if (message.type === 'event:counts') {
      if (message.data.eventId === current._id) {
        this.event.set({
          ...current,
          registeredCount: message.data.registeredCount,
          capacity: message.data.capacity
        });
      }
      return;
    }

    // Registration messages for other events are ignored
    if (message.data.event._id !== current._id) return;

    const row: AttendeeRegistration = {
      _id: message.data._id,
      status: message.data.status,
      registeredAt: message.data.registeredAt,
      cancelledAt: message.data.cancelledAt,
      user: message.data.user
    };

    this.registrations.update((list) =>
      message.type === 'registration:created'
        ? [row, ...list.filter((item) => item._id !== row._id)]
        : list.map((item) => (item._id === row._id ? row : item))
    );
    this.flash(row._id);
  }

  private flash(id: string): void {
    this.flashing.update((ids) => new Set(ids).add(id));

    setTimeout(() => {
      this.flashing.update((ids) => {
        const next = new Set(ids);
        next.delete(id);
        return next;
      });
    }, 1500);
  }
}