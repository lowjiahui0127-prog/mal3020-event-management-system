import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';

import { EventApi, EventPayload } from '../../services/event-api';
import { EventForm } from '../../components/event-form/event-form';
import { getErrorMessage } from '../../utils/http-error';

@Component({
  selector: 'app-create-event',
  imports: [RouterLink, FontAwesomeModule, EventForm],
  templateUrl: './create-event.html',
  styleUrl: './create-event.css'
})
export class CreateEvent {
  private readonly eventApi = inject(EventApi);
  private readonly router = inject(Router);

  readonly faArrowLeft = faArrowLeft;

  readonly submitting = signal(false);
  readonly serverError = signal('');

  save(payload: EventPayload): void {
    if (this.submitting()) return;

    this.submitting.set(true);
    this.serverError.set('');

    this.eventApi.createEvent(payload).subscribe({
      next: (response) => {
        const title = response.data.title;
        const notice =
          response.data.status === 'published'
            ? `"${title}" is published.`
            : `"${title}" was saved as a draft.`;

        void this.router.navigate(['/organiser/events'], { state: { notice } });
      },
      error: (error: unknown) => {
        this.serverError.set(
          getErrorMessage(error, 'Could not create the event. Please try again.')
        );
        this.submitting.set(false);
      }
    });
  }
}