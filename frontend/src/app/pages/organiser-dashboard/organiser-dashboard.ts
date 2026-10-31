import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faCalendarDays,
  faCheckCircle,
  faUsers,
  faPlus,
  faArrowRight,
  faLocationDot,
  faClock,
  faRotateRight,
  faPenToSquare,
  faClipboardList,
  faCalendarXmark
} from '@fortawesome/free-solid-svg-icons';

import { EventApi } from '../../services/event-api';
import { EventItem } from '../../models/event.model';

@Component({
  selector: 'app-organiser-dashboard',
  imports: [
    DatePipe,
    TitleCasePipe,
    RouterLink,
    FontAwesomeModule
  ],
  templateUrl: './organiser-dashboard.html',
  styleUrl: './organiser-dashboard.css',
})
export class OrganiserDashboard implements OnInit {
  private readonly eventApi = inject(EventApi);

  readonly faCalendarDays = faCalendarDays;
  readonly faCheckCircle = faCheckCircle;
  readonly faUsers = faUsers;
  readonly faPlus = faPlus;
  readonly faArrowRight = faArrowRight;
  readonly faLocationDot = faLocationDot;
  readonly faClock = faClock;
  readonly faRotateRight = faRotateRight;
  readonly faPenToSquare = faPenToSquare;
  readonly faClipboardList = faClipboardList;
  readonly faCalendarXmark = faCalendarXmark;

  readonly events = signal<EventItem[]>([]);
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');

  readonly totalEvents = computed(() => this.events().length);

  readonly publishedEvents = computed(
    () => this.events().filter(event => event.status === 'published').length
  );

  readonly totalRegistrations = signal<number | null>(null);

  ngOnInit(): void {
    this.loadEvents();
  }

  loadEvents(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.eventApi.getEvents().subscribe({
      next: (response) => {
        this.events.set(response.data ?? []);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Failed to load organiser events:', error);
        this.errorMessage.set(
          'Unable to load your events. Please check your connection and try again.'
        );
        this.isLoading.set(false);
      }
    });
  }
}
