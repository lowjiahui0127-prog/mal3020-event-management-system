import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faArrowRight,
  faCalendarDays,
  faLocationDot,
  faRotateRight
} from '@fortawesome/free-solid-svg-icons';

import { RegistrationApi } from '../../services/registration-api';
import {
  RegistrationItem,
  STATUS_LABELS,
  getDisplayStatus,
  getReference
} from '../../models/registration.model';
import { getErrorMessage } from '../../utils/http-error';

type Filter = 'upcoming' | 'past' | 'cancelled';

@Component({
  selector: 'app-my-registrations',
  imports: [DatePipe, RouterLink, FontAwesomeModule],
  templateUrl: './my-registrations.html',
  styleUrl: './my-registrations.css'
})
export class MyRegistrations implements OnInit {
  private readonly registrationApi = inject(RegistrationApi);

  readonly faArrowRight = faArrowRight;
  readonly faCalendarDays = faCalendarDays;
  readonly faLocationDot = faLocationDot;
  readonly faRotateRight = faRotateRight;

  readonly filters: { id: Filter; label: string }[] = [
    { id: 'upcoming', label: 'Upcoming' },
    { id: 'past', label: 'Past' },
    { id: 'cancelled', label: 'Cancelled' }
  ];
  readonly skeletonItems = [1, 2, 3];

  readonly registrations = signal<RegistrationItem[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');
  readonly activeFilter = signal<Filter>('upcoming');

  readonly groups = computed(() => {
    const now = Date.now();
    const upcoming: RegistrationItem[] = [];
    const past: RegistrationItem[] = [];
    const cancelled: RegistrationItem[] = [];

    for (const registration of this.registrations()) {
      const status = getDisplayStatus(registration, now);

      if (status === 'cancelled') {
        cancelled.push(registration);
      } else if (status === 'confirmed') {
        upcoming.push(registration);
      } else {
        past.push(registration); // completed or event cancelled
      }
    }

    const byDate = (a: RegistrationItem, b: RegistrationItem) =>
      new Date(a.event.date).getTime() - new Date(b.event.date).getTime();

    upcoming.sort(byDate);
    past.sort((a, b) => byDate(b, a));
    cancelled.sort((a, b) => byDate(b, a));

    return { upcoming, past, cancelled };
  });

  readonly visible = computed(() => this.groups()[this.activeFilter()]);

  readonly emptyCopy = computed(() => {
    switch (this.activeFilter()) {
      case 'upcoming':
        return {
          title: 'Nothing coming up',
          text: 'You have no upcoming registrations. Find your next event.'
        };
      case 'past':
        return {
          title: 'No past events yet',
          text: 'Events you registered for that have finished, or were cancelled by the organiser, will appear here.'
        };
      default:
        return {
          title: 'No cancelled registrations',
          text: 'Registrations you cancel will be listed here.'
        };
    }
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.registrationApi.getMine().subscribe({
      next: (response) => {
        this.registrations.set(response.data);
        this.isLoading.set(false);
      },
      error: (error: unknown) => {
        this.errorMessage.set(
          getErrorMessage(error, 'We could not load your registrations.')
        );
        this.isLoading.set(false);
      }
    });
  }

  retry(): void {
    this.load();
  }

  statusOf(registration: RegistrationItem) {
    return getDisplayStatus(registration);
  }

  statusLabel(registration: RegistrationItem): string {
    return STATUS_LABELS[getDisplayStatus(registration)];
  }

  reference(registration: RegistrationItem): string {
    return getReference(registration);
  }
}