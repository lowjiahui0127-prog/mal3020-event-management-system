import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { EventApi } from '../../services/event-api';
import { EventItem } from '../../models/event.model';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faCalendarDays,
  faChevronRight,
  faLocationDot,
  faUserGroup
} from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-event-details',
  imports: [DatePipe, RouterLink, FontAwesomeModule],
  templateUrl: './event-details.html',
  styleUrl: './event-details.css'
})
export class EventDetails implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly eventApi = inject(EventApi);

  readonly event = signal<EventItem | null>(null);
  readonly loading = signal(true);
  readonly errorMessage = signal('');
  readonly faCalendarDays = faCalendarDays;
  readonly faChevronRight = faChevronRight;
  readonly faLocationDot = faLocationDot;
  readonly faUserGroup = faUserGroup;

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
    this.event.set(null);

    this.eventApi.getEventById(id).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.event.set(response.data);
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
}
