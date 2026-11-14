import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faArrowRight,
  faPlus,
  faRotateRight
} from '@fortawesome/free-solid-svg-icons';

import { EventApi } from '../../services/event-api';
import { EventItem } from '../../models/event.model';
import { RecentRegistration } from '../../models/registration.model';
import { getErrorMessage } from '../../utils/http-error';
import { RealtimeService } from '../../services/realtime.service';
import { RealtimeMessage, RegistrationActivity } from '../../models/realtime.model';
import { LiveIndicator } from '../../components/live-indicator/live-indicator';

@Component({
  selector: 'app-organiser-dashboard',
  imports: [DatePipe, RouterLink, FontAwesomeModule, LiveIndicator],
  templateUrl: './organiser-dashboard.html',
  styleUrl: './organiser-dashboard.css'
})
export class OrganiserDashboard implements OnInit {
  private readonly eventApi = inject(EventApi);
  private readonly realtime = inject(RealtimeService);
  private readonly destroyRef = inject(DestroyRef);

  // Events whose numbers just changed (they flash briefly)
  readonly flashing = signal<ReadonlySet<string>>(new Set<string>());

  readonly faArrowRight = faArrowRight;
  readonly faPlus = faPlus;
  readonly faRotateRight = faRotateRight;

  readonly skeletonItems = [1, 2, 3, 4];

  readonly events = signal<EventItem[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');

  readonly recent = signal<RecentRegistration[]>([]);
  readonly recentLoading = signal(true);

  // Published events that have not ended yet, soonest first
  readonly activeEvents = computed(() => {
    const now = Date.now();

    return this.events()
      .filter(
        (event) =>
          event.status === 'published' &&
          new Date(event.endDate || event.date).getTime() >= now
      )
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  });

  readonly nextEvents = computed(() => this.activeEvents().slice(0, 5));
  readonly upcomingCount = computed(() => this.activeEvents().length);

  readonly draftCount = computed(
    () => this.events().filter((event) => event.status === 'draft').length
  );

  // Confirmed registrations across events that are not cancelled
  readonly totalRegistrations = computed(() =>
    this.events()
      .filter((event) => event.status !== 'cancelled')
      .reduce((sum, event) => sum + event.registeredCount, 0)
  );

  // Seats taken across the upcoming published events
  readonly fillRate = computed(() => {
    const active = this.activeEvents();
    const capacity = active.reduce((sum, event) => sum + event.capacity, 0);
    const registered = active.reduce((sum, event) => sum + event.registeredCount, 0);

    return capacity > 0 ? Math.round((registered / capacity) * 100) : 0;
  });

  ngOnInit(): void {
    this.loadEvents();
    this.loadRecent();

    // Live updates pushed by the server
    this.realtime.messages$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((message) => this.onMessage(message));

    // After a dropped connection, fetch everything again so the numbers are right
    this.realtime.reconnected$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.loadEvents(true);
        this.loadRecent();
      });
  }

  loadEvents(silent = false): void {
    if (!silent) {
      this.isLoading.set(true);
    }
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

  // Not critical: if the feed fails, the rest of the dashboard still works
  loadRecent(): void {
    this.recentLoading.set(true);

    this.eventApi.getRecentRegistrations().subscribe({
      next: (response) => {
        this.recent.set(response.data ?? []);
        this.recentLoading.set(false);
      },
      error: () => {
        this.recent.set([]);
        this.recentLoading.set(false);
      }
    });
  }

  private onMessage(message: RealtimeMessage): void {
    switch (message.type) {
      case 'event:counts':
        this.applyCounts(message.data);
        break;
      case 'registration:created':
        this.addToFeed(message.data);
        break;
      case 'registration:cancelled':
        this.recent.update((list) =>
          list.filter((item) => item._id !== message.data._id)
        );
        break;
    }
  }

  // Counts are public, so ignore events that are not mine
  private applyCounts(data: { eventId: string; registeredCount: number; capacity: number }): void {
    if (!this.events().some((event) => event._id === data.eventId)) return;

    this.events.update((list) =>
      list.map((event) =>
        event._id === data.eventId
          ? { ...event, registeredCount: data.registeredCount, capacity: data.capacity }
          : event
      )
    );
    this.flash(data.eventId);
  }

  private addToFeed(activity: RegistrationActivity): void {
    const entry: RecentRegistration = {
      _id: activity._id,
      registeredAt: activity.registeredAt,
      user: { _id: activity.user._id, name: activity.user.name },
      event: activity.event
    };

    // Newest first; a re-registration reuses the same id, so replace instead of duplicating
    this.recent.update((list) =>
      [entry, ...list.filter((item) => item._id !== entry._id)].slice(0, 8)
    );
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

  percent(event: EventItem): number {
    if (!event.capacity) return 0;
    return Math.min(100, Math.round((event.registeredCount / event.capacity) * 100));
  }

  timeAgo(iso: string): string {
    const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} h ago`;

    return `${Math.floor(hours / 24)} d ago`;
  }
}