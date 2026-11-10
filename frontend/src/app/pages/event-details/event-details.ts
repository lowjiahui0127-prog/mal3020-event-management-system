import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faCalendarDays,
  faChevronRight,
  faCircleCheck,
  faLocationDot,
  faUserGroup
} from '@fortawesome/free-solid-svg-icons';

import { EventApi } from '../../services/event-api';
import { RegistrationApi } from '../../services/registration-api';
import { AuthService } from '../../services/auth.service';
import { EventItem } from '../../models/event.model';
import { RegistrationItem } from '../../models/registration.model';
import { getErrorMessage } from '../../utils/http-error';

@Component({
  selector: 'app-event-details',
  imports: [DatePipe, RouterLink, FontAwesomeModule],
  templateUrl: './event-details.html',
  styleUrl: './event-details.css'
})
export class EventDetails implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly eventApi = inject(EventApi);
  private readonly registrationApi = inject(RegistrationApi);
  protected readonly auth = inject(AuthService);

  readonly event = signal<EventItem | null>(null);
  readonly loading = signal(true);
  readonly errorMessage = signal('');

  // The logged-in attendee's confirmed registration for this event (if any)
  readonly myRegistration = signal<RegistrationItem | null>(null);
  readonly actionBusy = signal(false);
  readonly actionError = signal('');
  readonly confirmingCancel = signal(false);

  readonly faCalendarDays = faCalendarDays;
  readonly faChevronRight = faChevronRight;
  readonly faCircleCheck = faCircleCheck;
  readonly faLocationDot = faLocationDot;
  readonly faUserGroup = faUserGroup;

  readonly seatsLeft = computed(() => {
    const item = this.event();
    return item ? Math.max(item.capacity - item.registeredCount, 0) : 0;
  });

  readonly isFull = computed(() => this.seatsLeft() === 0);

  readonly fillPercent = computed(() => {
    const item = this.event();
    if (!item || !item.capacity) return 0;
    return Math.min(100, Math.round((item.registeredCount / item.capacity) * 100));
  });

  readonly hasStarted = computed(() => {
    const item = this.event();
    return item ? new Date(item.date).getTime() <= Date.now() : false;
  });

  readonly hasEnded = computed(() => {
    const item = this.event();
    return item
      ? new Date(item.endDate || item.date).getTime() < Date.now()
      : false;
  });

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');

      if (!id) {
        this.errorMessage.set('No event ID was provided.');
        this.loading.set(false);
        return;
      }

      this.loadEvent(id);
    });
  }

  loadEvent(id: string): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.actionError.set('');
    this.confirmingCancel.set(false);
    this.event.set(null);
    this.myRegistration.set(null);

    this.eventApi.getEventById(id).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.event.set(response.data);
          this.loadMyRegistration(id);
        } else {
          this.errorMessage.set('Event details could not be found.');
        }

        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set(
          'Could not load this event. Please try again later.'
        );
        this.loading.set(false);
      }
    });
  }

  register(): void {
    const item = this.event();

    if (!item || this.actionBusy()) {
      return;
    }

    this.actionBusy.set(true);
    this.actionError.set('');

    this.registrationApi.register(item._id).subscribe({
      next: (response) => {
        this.myRegistration.set(response.data);
        this.syncCount(response.data.event.registeredCount);
        this.actionBusy.set(false);
      },
      error: (error: unknown) => {
        this.actionError.set(
          getErrorMessage(
            error,
            'Could not complete your registration. Please try again.'
          )
        );
        this.actionBusy.set(false);

        // The page may be out of date (for example the event just filled up)
        this.refreshEvent(item._id);
        this.loadMyRegistration(item._id);
      }
    });
  }

  cancel(): void {
    const registration = this.myRegistration();
    const item = this.event();

    if (!registration || !item || this.actionBusy()) {
      return;
    }

    this.actionBusy.set(true);
    this.actionError.set('');

    this.registrationApi.cancel(registration._id).subscribe({
      next: (response) => {
        this.myRegistration.set(null);
        this.confirmingCancel.set(false);
        this.syncCount(response.data.event.registeredCount);
        this.actionBusy.set(false);
      },
      error: (error: unknown) => {
        this.actionError.set(
          getErrorMessage(
            error,
            'Could not cancel your registration. Please try again.'
          )
        );
        this.confirmingCancel.set(false);
        this.actionBusy.set(false);

        this.refreshEvent(item._id);
        this.loadMyRegistration(item._id);
      }
    });
  }

  private loadMyRegistration(eventId: string): void {
    if (this.auth.role() !== 'attendee') {
      this.myRegistration.set(null);
      return;
    }

    this.registrationApi.getMine().subscribe({
      next: (response) => {
        this.myRegistration.set(
          response.data.find(
            (registration) =>
              registration.event._id === eventId &&
              registration.status === 'confirmed'
          ) ?? null
        );
      },
      // Not critical: the server still enforces every rule
      error: () => this.myRegistration.set(null)
    });
  }

  private refreshEvent(id: string): void {
    this.eventApi.getEventById(id).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.event.set(response.data);
        }
      },
      error: () => undefined
    });
  }

  private syncCount(registeredCount: number): void {
    this.event.update((current) =>
      current ? { ...current, registeredCount } : current
    );
  }
}