import { Component, OnInit, computed, inject, signal } from '@angular/core';
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

type Filter = 'all' | 'confirmed' | 'cancelled';

@Component({
  selector: 'app-event-registrations',
  imports: [DatePipe, RouterLink, FontAwesomeModule],
  templateUrl: './event-registrations.html',
  styleUrl: './event-registrations.css'
})
export class EventRegistrations implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly eventApi = inject(EventApi);

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
  }

  load(id: string): void {
    this.isLoading.set(true);
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
}