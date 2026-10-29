import { Component, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  FontAwesomeModule
} from '@fortawesome/angular-fontawesome';
import {
  faCalendarDays,
  faClock,
  faLocationDot,
  faArrowRight,
  faRotateRight,
  faTicket
} from '@fortawesome/free-solid-svg-icons';

interface RegistrationView {
  id: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
  status: 'confirmed' | 'cancelled' | 'pending';
}

@Component({
  selector: 'app-my-registrations',
  imports: [DatePipe, RouterLink, FontAwesomeModule],
  templateUrl: './my-registrations.html',
  styleUrl: './my-registrations.css',
})
export class MyRegistrations {
  readonly faCalendarDays = faCalendarDays;
  readonly faClock = faClock;
  readonly faLocationDot = faLocationDot;
  readonly faArrowRight = faArrowRight;
  readonly faRotateRight = faRotateRight;
  readonly faTicket = faTicket;

  // Registration data will be loaded from the backend later.
  readonly registrations = signal<RegistrationView[]>([]);

  readonly isLoading = signal(false);
  readonly errorMessage = signal('');

  retry(): void {
    // TODO: Call the registration API when it is available.
    this.errorMessage.set('');
  }
}
